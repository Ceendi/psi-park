"""Invoice factories (PLAN 15-B6).

``InvoiceFactory`` attaches a tiny fake PDF so API tests never have to invoke WeasyPrint —
the real render path is exercised in ``test_services``. The reservation defaults to a paid,
host-awaiting booking (the state in which an invoice exists in production).
"""

from decimal import Decimal

import factory
from django.utils import timezone

from apps.invoices.models import Invoice
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory


class PaidReservationFactory(ReservationFactory):
    """A reservation that has been paid for (the precondition for an invoice)."""

    status = Reservation.Status.AWAITING_HOST
    paid_at = factory.LazyFunction(timezone.now)
    expires_at = None


class InvoiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Invoice

    reservation = factory.SubFactory(PaidReservationFactory)
    number = factory.Sequence(lambda n: f"PSI/2026/06/{n + 1:04d}")
    issued_at = factory.LazyFunction(timezone.now)
    total_gross = Decimal("99.00")
    pdf = factory.django.FileField(filename="invoice.pdf", data=b"%PDF-1.4 fake invoice bytes")
