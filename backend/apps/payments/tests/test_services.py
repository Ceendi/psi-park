"""Service-layer tests for payments (PLAN 15-B5).

Stripe is fully mocked — no network. Covered: ``start_payment`` (happy/idempotent/bad
state), the webhook handlers (succeeded drives the reservation + e-mail, idempotent on
re-delivery, failed/refunded, unknown intent/type), and ``refund_if_paid`` including the
B4 reject seam that calls it lazily.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import Mock

import pytest
from django.core import mail
from django.utils import timezone
from freezegun import freeze_time

from apps.core.exceptions import PaymentAlreadyProcessed, ReservationExpired
from apps.payments import gateway, services
from apps.payments.models import Payment
from apps.payments.tests.factories import PaymentFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status
_PStatus = Payment.Status

_BILLING = {
    "billing_name": "Katarzyna Nowak",
    "billing_email": "katarzyna@example.pl",
    "billing_address": "ul. Polna 1",
    "billing_postal_code": "30-001",
    "billing_city": "Kraków",
}


def _fake_intent(monkeypatch, intent_id="pi_123", secret="pi_123_secret"):
    """Patch the gateway so it returns a fixed intent without touching Stripe."""
    fake = Mock(return_value=(intent_id, secret))
    monkeypatch.setattr(gateway, "create_payment_intent", fake)
    return fake


def _succeeded_event(intent_id):
    return {"type": "payment_intent.succeeded", "data": {"object": {"id": intent_id}}}


def _failed_event(intent_id):
    return {"type": "payment_intent.payment_failed", "data": {"object": {"id": intent_id}}}


def _refunded_event(intent_id):
    return {"type": "charge.refunded", "data": {"object": {"payment_intent": intent_id}}}


# --- start_payment --------------------------------------------------------------------


def test_start_payment_creates_pending_payment(monkeypatch):
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    fake = _fake_intent(monkeypatch)

    payment, client_secret = services.start_payment(reservation=reservation, billing=_BILLING)

    assert client_secret == "pi_123_secret"
    assert payment.stripe_payment_intent_id == "pi_123"
    assert payment.status == _PStatus.PENDING
    assert payment.amount == reservation.total_price
    assert payment.currency == "pln"
    assert payment.billing_name == "Katarzyna Nowak"
    assert payment.billing_country == "PL"
    # Gateway called with the PLN total and a stable idempotency key (PLAN B5).
    kwargs = fake.call_args.kwargs
    assert kwargs["amount_pln"] == reservation.total_price
    assert kwargs["idempotency_key"] == f"pi-reservation-{reservation.id}"


def test_start_payment_is_idempotent(monkeypatch):
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    _fake_intent(monkeypatch)

    services.start_payment(reservation=reservation, billing=_BILLING)
    services.start_payment(
        reservation=reservation, billing={**_BILLING, "billing_city": "Warszawa"}
    )

    assert Payment.objects.filter(reservation=reservation).count() == 1
    payment = Payment.objects.get(reservation=reservation)
    assert payment.stripe_payment_intent_id == "pi_123"
    assert payment.billing_city == "Warszawa"  # re-submitted billing is updated


def test_start_payment_rejects_already_paid(monkeypatch):
    reservation = ReservationFactory(status=_Status.AWAITING_HOST, paid_at=timezone.now())
    _fake_intent(monkeypatch)

    with pytest.raises(PaymentAlreadyProcessed):
        services.start_payment(reservation=reservation, billing=_BILLING)


def test_start_payment_rejects_expired_hold(monkeypatch):
    _fake_intent(monkeypatch)
    with freeze_time("2026-06-15 12:00:00"):
        reservation = ReservationFactory(
            status=_Status.PENDING_PAYMENT,
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        with pytest.raises(ReservationExpired):
            services.start_payment(reservation=reservation, billing=_BILLING)


# --- webhook: succeeded ---------------------------------------------------------------


def test_webhook_succeeded_confirms_payment_and_advances_reservation(monkeypatch):
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    PaymentFactory(
        reservation=reservation, status=_PStatus.PENDING, stripe_payment_intent_id="pi_ok"
    )

    services.handle_webhook(event=_succeeded_event("pi_ok"))

    payment = Payment.objects.get(stripe_payment_intent_id="pi_ok")
    reservation.refresh_from_db()
    assert payment.status == _PStatus.SUCCEEDED
    assert payment.paid_at is not None
    assert reservation.status == _Status.AWAITING_HOST
    assert reservation.paid_at is not None
    assert reservation.expires_at is None
    # reservation_paid e-mail to the client.
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [reservation.client.email]


def test_webhook_succeeded_is_idempotent(monkeypatch):
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    PaymentFactory(
        reservation=reservation, status=_PStatus.PENDING, stripe_payment_intent_id="pi_ok"
    )

    services.handle_webhook(event=_succeeded_event("pi_ok"))
    services.handle_webhook(event=_succeeded_event("pi_ok"))

    reservation.refresh_from_db()
    assert reservation.status == _Status.AWAITING_HOST
    assert len(mail.outbox) == 1  # second delivery sends nothing


def test_webhook_succeeded_without_invoice_app_sends_plain_mail():
    """B6 absent → the paid mail still goes out, just without the PDF attachment."""
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    PaymentFactory(
        reservation=reservation, status=_PStatus.PENDING, stripe_payment_intent_id="pi_ok"
    )

    services.handle_webhook(event=_succeeded_event("pi_ok"))

    assert len(mail.outbox) == 1
    assert mail.outbox[0].attachments == []


# --- webhook: failed / refunded / unknown ---------------------------------------------


def test_webhook_failed_marks_payment_and_keeps_hold():
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    PaymentFactory(
        reservation=reservation, status=_PStatus.PENDING, stripe_payment_intent_id="pi_bad"
    )

    services.handle_webhook(event=_failed_event("pi_bad"))

    payment = Payment.objects.get(stripe_payment_intent_id="pi_bad")
    reservation.refresh_from_db()
    assert payment.status == _PStatus.FAILED
    assert reservation.status == _Status.PENDING_PAYMENT  # client may retry until TTL
    assert mail.outbox == []


def test_webhook_charge_refunded_marks_payment():
    payment = PaymentFactory(status=_PStatus.SUCCEEDED, stripe_payment_intent_id="pi_ref")

    services.handle_webhook(event=_refunded_event("pi_ref"))

    payment.refresh_from_db()
    assert payment.status == _PStatus.REFUNDED
    assert payment.refunded_at is not None


def test_webhook_charge_refunded_is_idempotent_after_refund_if_paid(monkeypatch):
    """refund_if_paid flips to refunded eagerly; the later webhook confirms it as a no-op."""
    monkeypatch.setattr(gateway, "refund", Mock())
    payment = PaymentFactory(status=_PStatus.SUCCEEDED, stripe_payment_intent_id="pi_dup")
    services.refund_if_paid(reservation=payment.reservation)
    refunded_at = Payment.objects.get(pk=payment.pk).refunded_at

    services.handle_webhook(event=_refunded_event("pi_dup"))

    payment.refresh_from_db()
    assert payment.status == _PStatus.REFUNDED
    assert payment.refunded_at == refunded_at  # unchanged — webhook was a no-op


def test_webhook_unknown_intent_is_noop():
    services.handle_webhook(event=_succeeded_event("pi_nonexistent"))  # must not raise


def test_webhook_unknown_event_type_is_ignored():
    PaymentFactory(status=_PStatus.PENDING, stripe_payment_intent_id="pi_x")
    services.handle_webhook(event={"type": "customer.created", "data": {"object": {}}})
    assert Payment.objects.get(stripe_payment_intent_id="pi_x").status == _PStatus.PENDING


# --- refund_if_paid (B4 seam) ---------------------------------------------------------


def test_refund_if_paid_refunds_succeeded_payment(monkeypatch):
    refund = Mock()
    monkeypatch.setattr(gateway, "refund", refund)
    payment = PaymentFactory(status=_PStatus.SUCCEEDED, stripe_payment_intent_id="pi_r")

    services.refund_if_paid(reservation=payment.reservation)

    payment.refresh_from_db()
    refund.assert_called_once_with(intent_id="pi_r")
    assert payment.status == _PStatus.REFUNDED
    assert payment.refunded_at is not None


def test_refund_if_paid_noop_without_payment(monkeypatch):
    refund = Mock()
    monkeypatch.setattr(gateway, "refund", refund)
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)

    services.refund_if_paid(reservation=reservation)

    refund.assert_not_called()


def test_reservation_reject_triggers_refund_through_seam(monkeypatch):
    """B4's reject lazily calls payments.refund_if_paid — prove the wiring end to end."""
    from apps.reservations import services as reservation_services

    refund = Mock()
    monkeypatch.setattr(gateway, "refund", refund)
    reservation = ReservationFactory(
        status=_Status.AWAITING_HOST, paid_at=timezone.now(), expires_at=None
    )
    payment = PaymentFactory(
        reservation=reservation, status=_PStatus.SUCCEEDED, stripe_payment_intent_id="pi_seam"
    )

    reservation_services.reject_reservation(
        host=reservation.garden.host, reservation_id=reservation.id
    )

    reservation.refresh_from_db()
    payment.refresh_from_db()
    assert reservation.status == _Status.REJECTED
    assert payment.status == _PStatus.REFUNDED
    refund.assert_called_once_with(intent_id="pi_seam")


def test_start_payment_amount_matches_total(monkeypatch):
    """The amount handed to Stripe is the reservation total as a Decimal (AD-16)."""
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT, total_price=Decimal("123.45"))
    fake = _fake_intent(monkeypatch)

    services.start_payment(reservation=reservation, billing=_BILLING)

    assert fake.call_args.kwargs["amount_pln"] == Decimal("123.45")
