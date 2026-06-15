"""Invoice generation and numbering (PLAN 7.6, 10.3, B6).

``generate_invoice`` is the seam B5 calls from the succeeded-payment webhook (PLAN 17.3):
it allocates the next ``PSI/RRRR/MM/NNNN`` number under a row lock, renders the PDF with
WeasyPrint and stores it on the media volume. Buyer data is the billing block captured at
checkout (``Payment``); the seller is the platform (settings). Money stays ``Decimal`` and
is formatted to the Polish ``89,50 zł`` shape only for display.
"""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.base import ContentFile
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from apps.invoices.models import Invoice, InvoiceSequence

_NBSP = " "  # non-breaking space: keeps "1 234,56 zl" and "2 godz." from wrapping


@transaction.atomic
def generate_invoice(*, reservation) -> Invoice:
    """Issue the invoice for a paid ``reservation`` (or return the one already issued).

    Called from the payments webhook once the charge succeeds (PLAN 10.3). Idempotent: a
    re-delivered webhook finds the existing invoice and returns it instead of allocating a
    second number. The number allocation and the row insert share one transaction so a
    failed render never burns a number.

    Returns:
        The persisted :class:`Invoice` with a rendered ``pdf``.
    """
    existing = Invoice.objects.filter(reservation=reservation).first()
    if existing is not None:
        return existing

    issued_at = timezone.now()
    issued_local = timezone.localtime(issued_at)
    number = _next_number(year=issued_local.year, month=issued_local.month)

    invoice = Invoice(
        reservation=reservation,
        number=number,
        issued_at=issued_at,
        total_gross=reservation.total_price,
    )
    pdf_bytes = _render_pdf(invoice=invoice, reservation=reservation)
    invoice.pdf.save(_pdf_filename(number), ContentFile(pdf_bytes), save=False)
    invoice.save()
    return invoice


def _next_number(*, year: int, month: int) -> str:
    """Allocate the next ``PSI/RRRR/MM/NNNN`` number for the month (race-free).

    The per-month :class:`InvoiceSequence` row is locked with ``select_for_update`` before
    its counter is bumped, so concurrent issues serialise and can never share a number
    (PLAN 7.6). Must run inside a transaction — ``generate_invoice`` provides one.
    """
    InvoiceSequence.objects.get_or_create(year=year, month=month)
    sequence = InvoiceSequence.objects.select_for_update().get(year=year, month=month)
    sequence.last_number += 1
    sequence.save(update_fields=["last_number", "updated_at"])
    return f"PSI/{year:04d}/{month:02d}/{sequence.last_number:04d}"


def _render_pdf(*, invoice: Invoice, reservation) -> bytes:
    """Render the invoice template to PDF bytes with WeasyPrint.

    WeasyPrint is imported lazily: it loads heavy native libraries (Pango et al.) present
    only in the Docker image (PLAN 4.1), so importing this module stays cheap and never
    fails on a bare host.
    """
    from weasyprint import HTML

    html = render_to_string(
        "invoices/invoice.html", _build_context(invoice=invoice, reservation=reservation)
    )
    return HTML(string=html).write_pdf()


def _build_context(*, invoice: Invoice, reservation) -> dict:
    """Assemble the (display-ready) template context for one invoice."""
    garden = reservation.garden
    hours = _booking_hours(reservation)
    items = [
        {
            "name": f"Wynajem ogrodu „{garden.title}”",
            "quantity": f"{hours}{_NBSP}godz.",
            "unit_price": _zl(reservation.price_per_hour_snapshot),
            "amount": _zl(reservation.subtotal),
        },
        {
            "name": "Prowizja serwisowa PsiPark",
            "quantity": f"1{_NBSP}usł.",
            "unit_price": _zl(reservation.service_fee),
            "amount": _zl(reservation.service_fee),
        },
    ]
    return {
        "invoice_number": invoice.number,
        "issued_at": timezone.localtime(invoice.issued_at),
        "seller": settings.INVOICE_SELLER,
        "buyer": _buyer(reservation=reservation),
        "garden": garden,
        "reservation": reservation,
        "start_time": timezone.localtime(reservation.start_time),
        "end_time": timezone.localtime(reservation.end_time),
        "items": items,
        "total_gross": _zl(invoice.total_gross),
    }


def _buyer(*, reservation) -> dict:
    """Buyer block — the billing data captured at checkout (PLAN 7.5, "Dane do rozliczenia").

    Falls back to the client's account identity if a payment somehow carries no billing
    block (defensive — checkout makes the address block required).
    """
    client = reservation.client
    payment = _payment_of(reservation)
    if payment is not None and payment.billing_name:
        return {
            "name": payment.billing_name,
            "company": payment.billing_company,
            "address": payment.billing_address,
            "postal_code": payment.billing_postal_code,
            "city": payment.billing_city,
            "country": payment.billing_country,
            "tax_id": payment.tax_id,
            "email": payment.billing_email or client.email,
        }
    return {
        "name": client.full_name or client.email,
        "company": "",
        "address": "",
        "postal_code": "",
        "city": "",
        "country": "PL",
        "tax_id": "",
        "email": client.email,
    }


def _payment_of(reservation):
    """The reservation's payment, or ``None`` if it has none (reverse 1-1 may be absent)."""
    try:
        return reservation.payment
    except ObjectDoesNotExist:
        return None


def _booking_hours(reservation) -> int:
    """Whole hours covered by the reservation window (slots are whole hours, PLAN 2.3)."""
    return int((reservation.end_time - reservation.start_time).total_seconds() // 3600)


def _zl(amount: Decimal) -> str:
    """Format a non-negative PLN ``Decimal`` as ``1 234,56 zł`` (comma decimal, NBSP groups).

    Invoice amounts (subtotal, fee, total) are always ≥ 0, so no sign handling is needed.
    """
    integer, fraction = f"{amount:.2f}".split(".")
    groups: list[str] = []
    while len(integer) > 3:
        groups.insert(0, integer[-3:])
        integer = integer[:-3]
    groups.insert(0, integer)
    return f"{_NBSP.join(groups)},{fraction}{_NBSP}zł"


def _pdf_filename(number: str) -> str:
    """File name for the stored PDF — ``PSI/2026/06/0001`` → ``PSI-2026-06-0001.pdf``."""
    return f"{number.replace('/', '-')}.pdf"
