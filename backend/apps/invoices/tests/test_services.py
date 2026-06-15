"""Service-layer tests for invoice generation and numbering (PLAN 15-B6).

Exercises the real WeasyPrint render (the suite runs in the Docker image with Pango, PLAN
4.1): a valid PDF is produced and stored, the ``PSI/RRRR/MM/NNNN`` counter is sequential
and resets per month, generation is idempotent, and the number allocation is locked
(``select_for_update`` ⇒ requires a transaction).
"""

from decimal import Decimal

import pytest
from django.db.transaction import TransactionManagementError
from freezegun import freeze_time

from apps.invoices import services
from apps.invoices.models import Invoice, InvoiceSequence
from apps.payments.models import Payment
from apps.payments.tests.factories import PaymentFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status


def _paid_reservation(**kwargs) -> Reservation:
    """A paid reservation with a succeeded payment carrying billing data."""
    reservation = ReservationFactory(status=_Status.AWAITING_HOST, expires_at=None, **kwargs)
    PaymentFactory(reservation=reservation, status=Payment.Status.SUCCEEDED)
    return reservation


# --- generation -----------------------------------------------------------------------


def test_generate_invoice_creates_numbered_pdf():
    reservation = _paid_reservation()

    with freeze_time("2026-06-15 09:00:00"):
        invoice = services.generate_invoice(reservation=reservation)

    assert invoice.number == "PSI/2026/06/0001"
    assert invoice.total_gross == reservation.total_price
    assert invoice.pdf.name.endswith(".pdf")
    assert reservation.invoice == invoice
    with invoice.pdf.open("rb") as pdf:
        assert pdf.read(5) == b"%PDF-"  # a real, well-formed PDF


def test_generate_invoice_without_payment_falls_back_to_client():
    """An invoice still renders if the reservation somehow has no billing block."""
    reservation = ReservationFactory(status=_Status.AWAITING_HOST, expires_at=None)

    invoice = services.generate_invoice(reservation=reservation)

    assert Invoice.objects.filter(reservation=reservation).exists()
    assert invoice.pdf


def test_generate_invoice_is_idempotent():
    reservation = _paid_reservation()

    first = services.generate_invoice(reservation=reservation)
    second = services.generate_invoice(reservation=reservation)

    assert first.pk == second.pk
    assert first.number == second.number
    assert Invoice.objects.filter(reservation=reservation).count() == 1


# --- numbering ------------------------------------------------------------------------


def test_invoice_numbers_are_sequential_within_month():
    with freeze_time("2026-06-15 09:00:00"):
        numbers = [
            services.generate_invoice(reservation=_paid_reservation()).number for _ in range(3)
        ]

    assert numbers == ["PSI/2026/06/0001", "PSI/2026/06/0002", "PSI/2026/06/0003"]
    assert InvoiceSequence.objects.get(year=2026, month=6).last_number == 3


def test_invoice_number_resets_each_month():
    with freeze_time("2026-06-20 09:00:00"):
        june = services.generate_invoice(reservation=_paid_reservation()).number
    with freeze_time("2026-07-02 09:00:00"):
        july = services.generate_invoice(reservation=_paid_reservation()).number

    assert june == "PSI/2026/06/0001"
    assert july == "PSI/2026/07/0001"


@pytest.mark.django_db(transaction=True)
def test_number_allocation_requires_a_transaction():
    """Proves the counter is locked: ``select_for_update`` errors outside a transaction."""
    with pytest.raises(TransactionManagementError):
        services._next_number(year=2026, month=6)


# --- helpers --------------------------------------------------------------------------


def test_zl_formats_polish_currency():
    nbsp = services._NBSP  # module non-breaking space, avoids a literal in the test
    assert services._zl(Decimal("89.50")) == f"89,50{nbsp}zł"
    assert services._zl(Decimal("9.00")) == f"9,00{nbsp}zł"
    assert services._zl(Decimal("1234.50")) == f"1{nbsp}234,50{nbsp}zł"


def test_pdf_filename_replaces_slashes():
    assert services._pdf_filename("PSI/2026/06/0001") == "PSI-2026-06-0001.pdf"
