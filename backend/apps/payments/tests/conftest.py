"""Shared fixtures for payment tests."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory


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
def reservation(client_user):
    """A fresh, unexpired ``pending_payment`` hold owned by ``client_user`` (99 zł)."""
    return ReservationFactory(
        client=client_user,
        status=Reservation.Status.PENDING_PAYMENT,
        expires_at=timezone.now() + timedelta(minutes=30),
    )


@pytest.fixture
def auth_client(api_client, client_user):
    """An APIClient authenticated as a fresh client, plus that client user."""
    api_client.force_authenticate(user=client_user)
    return api_client, client_user


@pytest.fixture
def billing_payload():
    """A valid "Dane do rozliczenia" block for the payment-intent request."""
    return {
        "billing_name": "Katarzyna Nowak",
        "billing_email": "katarzyna@example.pl",
        "billing_address": "ul. Polna 1",
        "billing_postal_code": "30-001",
        "billing_city": "Kraków",
    }
