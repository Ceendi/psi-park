"""Service-layer tests for chat (PLAN 6.4, 15-B8).

Covers the three write use cases and their guards: idempotent get-or-create scoped to public
gardens, message posting with participant + length validation and the ``last_message_at`` bump,
and read marking that only touches the other party's messages.
"""

import pytest
from rest_framework.exceptions import NotFound

from apps.chat import services
from apps.chat.models import Conversation
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory

pytestmark = pytest.mark.django_db


class TestGetOrCreateConversation:
    def test_creates_on_first_contact(self, client_user, garden):
        conversation, created = services.get_or_create_conversation(
            client=client_user, garden_id=garden.id
        )
        assert created is True
        assert conversation.client_id == client_user.id
        assert conversation.garden_id == garden.id

    def test_is_idempotent(self, client_user, garden):
        first, created_first = services.get_or_create_conversation(
            client=client_user, garden_id=garden.id
        )
        second, created_second = services.get_or_create_conversation(
            client=client_user, garden_id=garden.id
        )
        assert created_first is True
        assert created_second is False
        assert first.id == second.id
        assert Conversation.objects.count() == 1

    def test_unknown_garden_raises_not_found(self, client_user):
        with pytest.raises(NotFound):
            services.get_or_create_conversation(client=client_user, garden_id=999999)

    def test_non_public_garden_raises_not_found(self, client_user):
        pending = GardenFactory(verification_status=Garden.Verification.PENDING)
        with pytest.raises(NotFound):
            services.get_or_create_conversation(client=client_user, garden_id=pending.id)

    def test_inactive_garden_raises_not_found(self, client_user):
        inactive = GardenFactory(is_active=False)
        with pytest.raises(NotFound):
            services.get_or_create_conversation(client=client_user, garden_id=inactive.id)


class TestPostMessage:
    def test_client_message_persists_and_bumps_recency(self, conversation, client_user):
        message = services.post_message(
            conversation=conversation, sender=client_user, content="  Dzień dobry!  "
        )
        assert message.content == "Dzień dobry!"  # trimmed
        conversation.refresh_from_db()
        assert conversation.last_message_at == message.created_at

    def test_host_is_a_participant(self, conversation, host_user):
        message = services.post_message(
            conversation=conversation, sender=host_user, content="Tak, zapraszam."
        )
        assert message.sender_id == host_user.id

    def test_non_participant_is_rejected(self, conversation, other_client):
        with pytest.raises(ValueError, match="sender_not_participant"):
            services.post_message(conversation=conversation, sender=other_client, content="Halo?")

    def test_empty_content_is_rejected(self, conversation, client_user):
        with pytest.raises(ValueError, match="content_empty"):
            services.post_message(conversation=conversation, sender=client_user, content="   ")

    def test_too_long_content_is_rejected(self, conversation, client_user):
        with pytest.raises(ValueError, match="content_too_long"):
            services.post_message(conversation=conversation, sender=client_user, content="x" * 2001)


class TestMarkRead:
    def test_marks_only_the_other_partys_messages(
        self, conversation, client_user, host_user, message_factory
    ):
        host_msg = message_factory(conversation=conversation, sender=host_user, content="Witaj!")
        own_msg = message_factory(conversation=conversation, sender=client_user, content="Cześć!")

        updated = services.mark_read(conversation=conversation, reader=client_user)

        host_msg.refresh_from_db()
        own_msg.refresh_from_db()
        assert updated == 1
        assert host_msg.read_at is not None
        assert own_msg.read_at is None  # you never mark your own as read

    def test_is_idempotent(self, conversation, host_user, client_user, message_factory):
        message_factory(conversation=conversation, sender=host_user)
        assert services.mark_read(conversation=conversation, reader=client_user) == 1
        assert services.mark_read(conversation=conversation, reader=client_user) == 0


class TestIsParticipant:
    def test_client_and_host_are_participants(self, conversation, client_user, host_user):
        assert services.is_participant(conversation=conversation, user=client_user)
        assert services.is_participant(conversation=conversation, user=host_user)

    def test_outsider_is_not(self, conversation, other_client):
        assert not services.is_participant(conversation=conversation, user=other_client)
