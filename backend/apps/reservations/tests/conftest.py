"""Shared fixtures for reservation tests."""

from datetime import date, time, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.dogs.tests.factories import DogFactory
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory


@pytest.fixture(autouse=True)
def _tmp_media(settings, tmp_path):
    """Write any uploaded/generated media into a per-test temp dir, not the real volume."""
    settings.MEDIA_ROOT = str(tmp_path / "media")


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
def other_host():
    return HostFactory()


@pytest.fixture
def garden(host_user):
    """An approved, active garden open 08-20 accepting up to 3 dogs at 45 zł/h."""
    return GardenFactory(
        host=host_user,
        max_dogs=3,
        price_per_hour=Decimal("45.00"),
        open_from=time(8, 0),
        open_to=time(20, 0),
        min_booking_hours=1,
        verification_status=Garden.Verification.APPROVED,
        is_active=True,
    )


@pytest.fixture
def dog(client_user):
    """A dog owned by the client with vaccinations valid well into the future."""
    return DogFactory(owner=client_user, vaccinations_valid_until=date(2031, 1, 1))


@pytest.fixture
def booking_window():
    """A whole-hour 10:00-12:00 window three days out (future, inside opening hours)."""
    start = (timezone.localtime(timezone.now()) + timedelta(days=3)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    return start, start + timedelta(hours=2)


@pytest.fixture
def auth_client(api_client, client_user):
    """An APIClient authenticated as a fresh client, plus that client user."""
    api_client.force_authenticate(user=client_user)
    return api_client, client_user


@pytest.fixture
def auth_host(api_client, host_user):
    """An APIClient authenticated as a fresh host, plus that host user."""
    api_client.force_authenticate(user=host_user)
    return api_client, host_user
