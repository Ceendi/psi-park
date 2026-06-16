"""Shared fixtures for chat tests (``_tmp_media`` comes from the root conftest).

The standard cast: ``client_user`` and ``host_user`` are the two participants of ``conversation``
(``host_user`` owns ``garden``); ``other_client`` is an outsider used for the isolation/403/404
cases. ``message_factory`` posts a line from a chosen participant and keeps ``last_message_at``
in step, the way the service does.
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.chat.models import ChatMessage, Conversation
from apps.chat.tests.factories import ConversationFactory
from apps.gardens.tests.factories import GardenFactory


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


@pytest.fixture
def conversation(garden, client_user):
    return ConversationFactory(garden=garden, client=client_user)


@pytest.fixture
def message_factory():
    """Create a message from ``sender`` in ``conversation`` and bump ``last_message_at``."""

    def _make(*, conversation: Conversation, sender: User, content: str = "Cześć!") -> ChatMessage:
        message = ChatMessage.objects.create(
            conversation=conversation, sender=sender, content=content
        )
        Conversation.objects.filter(pk=conversation.pk).update(last_message_at=message.created_at)
        return message

    return _make


@pytest.fixture
def auth_client(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    return api_client, client_user


@pytest.fixture
def auth_host(api_client, host_user):
    api_client.force_authenticate(user=host_user)
    return api_client, host_user


@pytest.fixture
def auth_other(api_client, other_client):
    api_client.force_authenticate(user=other_client)
    return api_client, other_client


@pytest.fixture
def now():
    return timezone.now()
