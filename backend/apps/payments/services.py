"""Payment write operations: start a payment, react to Stripe webhooks, refund (PLAN B5).

The browser never decides anything: ``start_payment`` only hands the client a
``client_secret`` to confirm the card, and the **webhook is the source of truth** for the
outcome (PLAN 10.1 / AD-4). ``handle_webhook`` is what actually advances the reservation
(``pending_payment → awaiting_host``), triggers the invoice (B6) and the paid e-mail.

Cross-part calls go downward through facades and are imported lazily so payments never
pins ``reservations`` at module load (PLAN 17.3): the gateway hides Stripe, e-mail goes
through ``notifications``, invoices through ``invoices`` (absent until B6 — a graceful
no-op). Money stays ``Decimal``; only ``gateway`` converts to grosze (AD-16).
"""

from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import PaymentAlreadyProcessed, ReservationExpired
from apps.notifications import services as notifications
from apps.payments import gateway
from apps.payments.models import Payment

_BILLING_FIELDS = (
    "billing_name",
    "billing_email",
    "billing_address",
    "billing_postal_code",
    "billing_city",
    "billing_country",
    "billing_company",
    "tax_id",
)


# --- start payment --------------------------------------------------------------------


@transaction.atomic
def start_payment(*, reservation, billing: dict) -> tuple[Payment, str]:
    """Create or refresh the Stripe PaymentIntent for ``reservation`` (PLAN 8.2, B5).

    Locks the reservation, then idempotently provisions one PaymentIntent for it: a
    repeated call (e.g. the client reopening the form) reuses the same intent and returns
    the same ``client_secret`` rather than creating duplicates. The submitted billing
    details are (re)saved so the eventual invoice (B6) bills the right buyer.

    Returns:
        ``(payment, client_secret)``.

    Raises:
        ReservationExpired: the unpaid hold's payment window has elapsed (410).
        PaymentAlreadyProcessed: the reservation is no longer awaiting payment (409).
    """
    from apps.reservations.models import Reservation

    reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
    _guard_payable(reservation)

    payment = Payment.objects.select_for_update().filter(reservation=reservation).first()
    if payment is not None and payment.status == Payment.Status.SUCCEEDED:
        raise PaymentAlreadyProcessed()

    intent_id, client_secret = gateway.create_payment_intent(
        amount_pln=reservation.total_price,
        metadata={"reservation_id": str(reservation.id)},
        idempotency_key=f"pi-reservation-{reservation.id}",
    )

    if payment is None:
        payment = Payment(reservation=reservation)
    payment.stripe_payment_intent_id = intent_id
    payment.amount = reservation.total_price
    payment.currency = gateway.CURRENCY
    _apply_billing(payment=payment, billing=billing)
    payment.save()
    return payment, client_secret


def _guard_payable(reservation) -> None:
    """A reservation may be paid only while it is an unexpired ``pending_payment`` hold."""
    if reservation.status != reservation.Status.PENDING_PAYMENT:
        raise PaymentAlreadyProcessed()
    if reservation.is_expired:
        raise ReservationExpired()


def _apply_billing(*, payment: Payment, billing: dict) -> None:
    """Copy the validated billing block onto the payment (blank-tolerant, PL default)."""
    for field in _BILLING_FIELDS:
        if field in billing:
            setattr(payment, field, billing[field])
    if not payment.billing_country:
        payment.billing_country = "PL"


# --- webhook (source of truth, PLAN 10.1) ---------------------------------------------


def handle_webhook(*, event) -> None:
    """Dispatch a verified Stripe event to its handler; unknown types are ignored.

    Idempotent end to end (re-delivered events are common): each handler is a no-op once
    the payment already holds the target status (PLAN 10.1 — ``payment.status`` is the
    functional idempotency key, no separate ledger needed in the MVP).
    """
    event_type = event["type"]
    obj = event["data"]["object"]
    if event_type == "payment_intent.succeeded":
        _mark_succeeded(intent_id=obj["id"])
    elif event_type == "payment_intent.payment_failed":
        _mark_failed(intent_id=obj["id"])
    elif event_type == "charge.refunded":
        _mark_refunded(intent_id=obj.get("payment_intent"))


@transaction.atomic
def _mark_succeeded(*, intent_id: str) -> None:
    """Record a successful charge and drive the reservation to ``awaiting_host``."""
    payment = _lock_payment(intent_id=intent_id)
    if payment is None or payment.status == Payment.Status.SUCCEEDED:
        return

    now = timezone.now()
    payment.status = Payment.Status.SUCCEEDED
    payment.paid_at = now
    payment.save(update_fields=["status", "paid_at", "updated_at"])

    reservation = payment.reservation
    if reservation.status == reservation.Status.PENDING_PAYMENT:
        from apps.reservations import services as reservation_services

        reservation_services.transition(
            reservation=reservation,
            target=reservation.Status.AWAITING_HOST,
            when=now,
        )
        invoice = _generate_invoice(reservation=reservation)
        _notify_paid(reservation=reservation, invoice=invoice)


@transaction.atomic
def _mark_failed(*, intent_id: str) -> None:
    """Mark a failed charge; the reservation stays a payable hold until its TTL."""
    payment = _lock_payment(intent_id=intent_id)
    if payment is None or payment.status in (Payment.Status.SUCCEEDED, Payment.Status.REFUNDED):
        return
    payment.status = Payment.Status.FAILED
    payment.save(update_fields=["status", "updated_at"])


@transaction.atomic
def _mark_refunded(*, intent_id: str | None) -> None:
    """Confirm a refund (idempotent — ``refund_if_paid`` usually set it already)."""
    payment = _lock_payment(intent_id=intent_id)
    if payment is None or payment.status == Payment.Status.REFUNDED:
        return
    payment.status = Payment.Status.REFUNDED
    payment.refunded_at = timezone.now()
    payment.save(update_fields=["status", "refunded_at", "updated_at"])


def _lock_payment(*, intent_id: str | None) -> Payment | None:
    """Lock and return the payment for a Stripe intent, joining the reservation it pays."""
    if not intent_id:
        return None
    return (
        Payment.objects.select_for_update()
        .select_related("reservation", "reservation__garden", "reservation__client")
        .filter(stripe_payment_intent_id=intent_id)
        .first()
    )


# --- refund seam used by B4 (reject / cancel) -----------------------------------------


@transaction.atomic
def refund_if_paid(*, reservation) -> None:
    """Refund the reservation's payment when one succeeded; otherwise do nothing (PLAN B5).

    This is the contract ``reservations.services`` calls from ``reject``/``cancel`` (PLAN
    17.3). The status is flipped to ``refunded`` eagerly so the DB is consistent the moment
    the decision is made; the later ``charge.refunded`` webhook confirms it idempotently.
    """
    payment = (
        Payment.objects.select_for_update()
        .filter(reservation=reservation, status=Payment.Status.SUCCEEDED)
        .first()
    )
    if payment is None:
        return
    gateway.refund(intent_id=payment.stripe_payment_intent_id)
    payment.status = Payment.Status.REFUNDED
    payment.refunded_at = timezone.now()
    payment.save(update_fields=["status", "refunded_at", "updated_at"])


# --- invoice (B6) + paid e-mail -------------------------------------------------------


def _generate_invoice(*, reservation):
    """Issue the invoice via B6 when available; ``None`` until that part ships.

    Contract for B6: ``invoices.services.generate_invoice(*, reservation)`` returns an
    object exposing ``.number`` and ``.pdf``. Until ``apps.invoices`` exists the import
    fails and the paid e-mail goes out without the PDF (the template makes it optional).
    """
    try:
        from apps.invoices import services as invoice_services
    except ImportError:
        return None
    return invoice_services.generate_invoice(reservation=reservation)


def _notify_paid(*, reservation, invoice) -> None:
    """Send ``reservation_paid`` to the client, attaching the invoice PDF when present."""
    context = {"user": reservation.client, "reservation": reservation}
    attachments = None
    if invoice is not None:
        context["invoice_number"] = invoice.number
        attachments = [notifications.invoice_pdf_attachment(number=invoice.number, pdf=invoice.pdf)]
    notifications.send(
        "reservation_paid",
        to=reservation.client.email,
        context=context,
        attachments=attachments,
    )
