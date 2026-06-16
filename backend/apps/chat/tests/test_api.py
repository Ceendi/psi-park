"""REST contract tests for chat (PLAN 6.4, 8.2 Czat).

Each endpoint is checked for the happy path, the auth wall (401), the role/participant wall
(403/404) and input validation (400). The list also has a query-budget guard (PLAN 12) and
asserts the unread badge, last-message preview and recency ordering it is responsible for.
"""

import pytest
from django.urls import reverse

from apps.chat.models import Conversation
from apps.chat.tests.factories import ChatMessageFactory, ConversationFactory
from apps.gardens.tests.factories import GardenFactory, GardenPhotoFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("conversation-list")


def messages_url(conversation_id: int) -> str:
    return reverse("conversation-messages", args=[conversation_id])


def read_url(conversation_id: int) -> str:
    return reverse("conversation-read", args=[conversation_id])


class TestListConversations:
    def test_requires_auth(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401

    def test_client_sees_only_own_threads(self, auth_client, conversation, garden):
        api, client_user = auth_client
        # A thread belonging to someone else must not show up.
        ConversationFactory(garden=garden)

        response = api.get(LIST_URL)

        assert response.status_code == 200
        ids = [row["id"] for row in response.data["results"]]
        assert ids == [conversation.id]

    def test_host_sees_threads_on_their_gardens(self, auth_host, conversation):
        api, _ = auth_host
        response = api.get(LIST_URL)
        ids = [row["id"] for row in response.data["results"]]
        assert conversation.id in ids

    def test_row_carries_unread_count_and_last_message(
        self, auth_client, conversation, host_user, client_user, message_factory
    ):
        api, _ = auth_client
        message_factory(conversation=conversation, sender=host_user, content="Witaj!")
        message_factory(conversation=conversation, sender=client_user, content="Hej!")
        # Two unread from host? No — only host's line is unread for the client.
        ChatMessageFactory(conversation=conversation, sender=host_user, content="Jeszcze tu?")

        row = api.get(LIST_URL).data["results"][0]

        assert row["unread_count"] == 2  # the two host lines, not the client's own
        assert row["last_message"]["content"] == "Jeszcze tu?"
        assert row["last_message"]["sender"] == host_user.id
        assert row["host"]["id"] == host_user.id
        assert row["client"]["id"] == client_user.id

    def test_row_carries_garden_cover_image(self, auth_client, conversation, garden):
        api, _ = auth_client
        GardenPhotoFactory(garden=garden, position=0)

        row = api.get(LIST_URL).data["results"][0]

        assert row["garden"]["cover_image"] is not None
        assert row["garden"]["cover_image"].startswith("http")

    def test_ordered_by_recency(self, auth_client, client_user, host_user, message_factory):
        api, _ = auth_client
        older = ConversationFactory(client=client_user)
        newer = ConversationFactory(client=client_user)
        message_factory(conversation=older, sender=client_user, content="older")
        message_factory(conversation=newer, sender=client_user, content="newer")

        ids = [row["id"] for row in api.get(LIST_URL).data["results"]]

        assert ids.index(newer.id) < ids.index(older.id)

    def test_list_query_budget(
        self, auth_client, host_user, message_factory, django_assert_max_num_queries
    ):
        api, client_user = auth_client
        for _ in range(3):
            conv = ConversationFactory(client=client_user)
            message_factory(conversation=conv, sender=host_user, content="hej")
        # One query for the page, one for the count, one for the photo prefetch — flat in N.
        with django_assert_max_num_queries(6):
            assert api.get(LIST_URL).status_code == 200


class TestStartConversation:
    def test_requires_auth(self, api_client, garden):
        assert api_client.post(LIST_URL, {"garden": garden.id}).status_code == 401

    def test_host_cannot_start(self, auth_host, garden):
        api, _ = auth_host
        assert api.post(LIST_URL, {"garden": garden.id}).status_code == 403

    def test_client_starts_thread(self, auth_client, garden):
        api, client_user = auth_client
        response = api.post(LIST_URL, {"garden": garden.id})
        assert response.status_code == 201
        assert response.data["garden"]["id"] == garden.id
        assert response.data["unread_count"] == 0
        assert response.data["last_message"] is None
        assert Conversation.objects.filter(garden=garden, client=client_user).count() == 1

    def test_is_idempotent(self, auth_client, garden):
        api, _ = auth_client
        first = api.post(LIST_URL, {"garden": garden.id})
        second = api.post(LIST_URL, {"garden": garden.id})
        assert first.status_code == 201
        assert second.status_code == 200  # already existed
        assert first.data["id"] == second.data["id"]
        assert Conversation.objects.count() == 1

    def test_unknown_garden_is_404(self, auth_client):
        api, _ = auth_client
        assert api.post(LIST_URL, {"garden": 999999}).status_code == 404

    def test_non_public_garden_is_404(self, auth_client):
        api, _ = auth_client
        pending = GardenFactory(verification_status="pending")
        assert api.post(LIST_URL, {"garden": pending.id}).status_code == 404

    def test_missing_garden_is_400(self, auth_client):
        api, _ = auth_client
        assert api.post(LIST_URL, {}).status_code == 400


class TestMessageHistory:
    def test_requires_auth(self, api_client, conversation):
        assert api_client.get(messages_url(conversation.id)).status_code == 401

    def test_participant_reads_history(self, auth_client, conversation, client_user):
        api, _ = auth_client
        ChatMessageFactory(conversation=conversation, sender=client_user, content="Hej")
        response = api.get(messages_url(conversation.id))
        assert response.status_code == 200
        assert response.data["has_more"] is False
        assert response.data["next_before"] is None
        assert response.data["results"][0]["content"] == "Hej"

    def test_non_participant_is_404(self, auth_other, conversation):
        api, _ = auth_other
        assert api.get(messages_url(conversation.id)).status_code == 404

    def test_keyset_pagination(self, auth_client, conversation, client_user):
        api, _ = auth_client
        ChatMessageFactory.create_batch(35, conversation=conversation, sender=client_user)

        first = api.get(messages_url(conversation.id)).data
        assert len(first["results"]) == 30
        assert first["has_more"] is True
        # Newest first within the page.
        assert first["results"][0]["id"] > first["results"][-1]["id"]

        second = api.get(messages_url(conversation.id), {"before": first["next_before"]}).data
        assert len(second["results"]) == 5
        assert second["has_more"] is False
        assert second["next_before"] is None
        # The second page is strictly older than the cursor.
        assert second["results"][0]["id"] < first["next_before"]

    def test_invalid_before_is_400(self, auth_client, conversation):
        api, _ = auth_client
        response = api.get(messages_url(conversation.id), {"before": "abc"})
        assert response.status_code == 400
        assert "before" in response.data


class TestMarkRead:
    def test_requires_auth(self, api_client, conversation):
        assert api_client.post(read_url(conversation.id)).status_code == 401

    def test_participant_marks_read(
        self, auth_client, conversation, host_user, client_user, message_factory
    ):
        api, _ = auth_client
        host_msg = message_factory(conversation=conversation, sender=host_user)
        own_msg = message_factory(conversation=conversation, sender=client_user)

        response = api.post(read_url(conversation.id))

        assert response.status_code == 200
        assert response.data["marked_read"] == 1
        host_msg.refresh_from_db()
        own_msg.refresh_from_db()
        assert host_msg.read_at is not None
        assert own_msg.read_at is None

    def test_non_participant_is_404(self, auth_other, conversation):
        api, _ = auth_other
        assert api.post(read_url(conversation.id)).status_code == 404
