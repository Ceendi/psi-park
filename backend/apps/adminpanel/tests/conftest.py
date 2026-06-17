"""Shared fixtures for admin-panel tests (``_tmp_media`` comes from the root conftest)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.adminpanel.tests.factories import AdminFactory
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return AdminFactory()


@pytest.fixture
def host_user():
    return HostFactory()


@pytest.fixture
def client_user():
    return UserFactory(role=User.Role.CLIENT)


@pytest.fixture
def pending_garden(host_user):
    """A garden awaiting verification — the row the admin queue is built for."""
    return GardenFactory(host=host_user, verification_status=Garden.Verification.PENDING)


@pytest.fixture
def auth_admin(api_client, admin_user):
    """An APIClient authenticated as an admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client, admin_user


@pytest.fixture
def auth_host(api_client, host_user):
    """An APIClient authenticated as a host (the wrong role for every admin endpoint)."""
    api_client.force_authenticate(user=host_user)
    return api_client, host_user


@pytest.fixture
def auth_client(api_client, client_user):
    """An APIClient authenticated as a client (the wrong role for every admin endpoint)."""
    api_client.force_authenticate(user=client_user)
    return api_client, client_user
