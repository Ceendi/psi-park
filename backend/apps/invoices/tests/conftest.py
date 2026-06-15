"""Shared fixtures for invoice tests (``_tmp_media`` comes from the root conftest)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.invoices.tests.factories import InvoiceFactory


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
def invoice(client_user):
    """An invoice (with a fake PDF) for a paid reservation owned by ``client_user``."""
    return InvoiceFactory(reservation__client=client_user)


@pytest.fixture
def auth_client(api_client, client_user):
    """An APIClient authenticated as the client who owns the ``invoice`` fixture."""
    api_client.force_authenticate(user=client_user)
    return api_client, client_user
