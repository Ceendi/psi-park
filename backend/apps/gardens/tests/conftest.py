"""Shared fixtures for garden tests."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory


@pytest.fixture(autouse=True)
def _tmp_media(settings, tmp_path):
    """Write any uploaded/generated media into a per-test temp dir, not the real volume."""
    settings.MEDIA_ROOT = str(tmp_path / "media")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def host_user():
    return HostFactory()


@pytest.fixture
def other_host():
    return HostFactory()


@pytest.fixture
def client_user():
    return UserFactory(role=User.Role.CLIENT)


@pytest.fixture
def admin_user():
    return UserFactory(role=User.Role.ADMIN, is_staff=True)


@pytest.fixture
def auth_host(api_client, host_user):
    """An APIClient authenticated as a fresh host, plus that host user."""
    api_client.force_authenticate(user=host_user)
    return api_client, host_user
