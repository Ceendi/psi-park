"""Shared fixtures for review tests (``_tmp_media`` comes from the root conftest)."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.gardens.tests.factories import GardenFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory
from apps.reviews.tests.factories import ReviewFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def client_user():
    return UserFactory(role=User.Role.CLIENT)


@pytest.fixture
def other_client():
    return UserFactory(role=User.Role.CLIENT)


@pytest.fixture
def host_user():
    return HostFactory()


@pytest.fixture
def garden(host_user):
    return GardenFactory(host=host_user)


def make_completed_reservation(*, client, garden, hours_ago: int = 48) -> Reservation:
    """A finished stay: a ``confirmed`` reservation whose 2h window ended ``hours_ago``."""
    end = timezone.now() - timedelta(hours=hours_ago)
    return ReservationFactory(
        client=client,
        garden=garden,
        status=Reservation.Status.CONFIRMED,
        start_time=end - timedelta(hours=2),
        end_time=end,
        paid_at=end - timedelta(days=1),
        decided_at=end - timedelta(days=1),
        expires_at=None,
    )


@pytest.fixture
def completed_reservation(client_user, garden):
    return make_completed_reservation(client=client_user, garden=garden)


@pytest.fixture
def review(client_user, garden, completed_reservation):
    """A review left by ``client_user`` for ``garden`` via the completed stay."""
    return ReviewFactory(
        author=client_user, garden=garden, reservation=completed_reservation, rating=5
    )


@pytest.fixture
def auth_client(api_client, client_user):
    """An APIClient authenticated as ``client_user``."""
    api_client.force_authenticate(user=client_user)
    return api_client, client_user


@pytest.fixture
def auth_host(api_client, host_user):
    """An APIClient authenticated as ``host_user``."""
    api_client.force_authenticate(user=host_user)
    return api_client, host_user
