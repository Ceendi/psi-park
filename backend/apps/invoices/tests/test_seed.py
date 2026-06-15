"""Seed test: the demo has paid reservations with downloadable invoices (PLAN 14)."""

import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.invoices.models import Invoice

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_invoices_for_paid_reservations():
    call_command("seed_demo")

    client = User.objects.get(email="katarzyna@psipark.local")
    invoices = Invoice.objects.filter(reservation__client=client)
    # One per succeeded payment (3 active paid reservations; the refunded one has none).
    assert invoices.count() == 3
    assert all(inv.number.startswith("PSI/") for inv in invoices)
    assert all(inv.pdf.name for inv in invoices)


def test_seed_demo_invoices_are_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")

    assert Invoice.objects.count() == 3
