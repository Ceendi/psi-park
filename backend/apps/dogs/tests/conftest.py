"""Shared fixtures for dog tests."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory


@pytest.fixture(autouse=True)
def _tmp_media(settings, tmp_path):
    """Write any uploaded media into a per-test temp dir instead of the real volume."""
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
def auth_client(api_client, client_user):
    """An APIClient authenticated as a fresh client, plus that client user."""
    api_client.force_authenticate(user=client_user)
    return api_client, client_user
