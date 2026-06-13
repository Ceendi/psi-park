import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.reservations.models import Reservation

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_reservations_across_states():
    call_command("seed_demo")

    client = User.objects.get(email="katarzyna@psipark.local")
    statuses = set(client.reservations.values_list("status", flat=True))
    assert client.reservations.count() == 4
    assert {
        Reservation.Status.CONFIRMED,
        Reservation.Status.AWAITING_HOST,
        Reservation.Status.CANCELLED,
    } <= statuses


def test_seed_demo_reservations_are_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")

    client = User.objects.get(email="katarzyna@psipark.local")
    assert client.reservations.count() == 4
