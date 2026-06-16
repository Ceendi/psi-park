"""Review factory (PLAN 15-B7).

Defaults to a 5★ review whose author/garden/reservation are independent sub-factories;
tests that care about the eligibility wiring pass a consistent trio explicitly (the
``review`` fixture ties all three to one completed stay).
"""

import factory

from apps.accounts.tests.factories import UserFactory
from apps.gardens.tests.factories import GardenFactory
from apps.reservations.tests.factories import ReservationFactory
from apps.reviews.models import Review


class ReviewFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Review

    author = factory.SubFactory(UserFactory)
    garden = factory.SubFactory(GardenFactory)
    reservation = factory.SubFactory(ReservationFactory)
    rating = 5
    comment = "Świetny, bezpieczny ogród. Polecam!"
