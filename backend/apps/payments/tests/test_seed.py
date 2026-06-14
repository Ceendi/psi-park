import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.payments.models import Payment

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_payments_for_paid_reservations():
    call_command("seed_demo")

    client = User.objects.get(email="katarzyna@psipark.local")
    payments = Payment.objects.filter(reservation__client=client)
    # 4 paid demo reservations: 3 still-active (succeeded) + 1 paid-then-cancelled (refunded).
    assert payments.count() == 4
    assert payments.filter(status=Payment.Status.SUCCEEDED).count() == 3
    assert payments.filter(status=Payment.Status.REFUNDED).count() == 1


def test_seed_demo_payments_are_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")

    assert Payment.objects.count() == 4
