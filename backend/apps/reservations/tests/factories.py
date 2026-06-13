"""Reservation factory, reused by the seed and by later parts (PLAN 15-B4).

Defaults to a not-yet-paid hold a few days out within the standard 08-20 opening window.
Tests override ``status``/``paid_at``/``start_time`` for other states; amounts default to
a consistent 2h @ 45 zł booking with the 10% platform fee.
"""

from datetime import timedelta
from decimal import Decimal

import factory
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.dogs.tests.factories import DogFactory
from apps.gardens.tests.factories import GardenFactory
from apps.reservations.models import Reservation


def _default_start():
    base = timezone.localtime(timezone.now()) + timedelta(days=3)
    return base.replace(hour=10, minute=0, second=0, microsecond=0)


class ReservationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Reservation

    client = factory.SubFactory(UserFactory)
    garden = factory.SubFactory(GardenFactory)
    dog = factory.SubFactory(DogFactory)
    dogs_count = 1
    start_time = factory.LazyFunction(_default_start)
    end_time = factory.LazyAttribute(lambda o: o.start_time + timedelta(hours=2))
    status = Reservation.Status.PENDING_PAYMENT
    price_per_hour_snapshot = Decimal("45.00")
    subtotal = Decimal("90.00")
    service_fee = Decimal("9.00")
    total_price = Decimal("99.00")
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(minutes=30))
