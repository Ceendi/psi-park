"""WebSocket tests for the chat consumer (PLAN 6.4, 9, 15-B8).

Driven through ``WebsocketCommunicator``. The suite has no ``pytest-asyncio`` to lean on (it is
not in the stack, PLAN 4.1), so each scenario is an ``async def`` run via ``async_to_sync`` and
every test is ``transaction=True`` — the consumer touches the DB on a worker thread, so the rows
must be committed to be visible there. The communicators run against the chat stack without the
origin validator (that wrapper is exercised by ``config.asgi``, not owned here).

Covered: JWT auth (accept/reject), the participant wall, persist→broadcast ordering, the badge
nudge to the other party's ``user_{id}`` group, typing, read receipts, length validation and the
flood throttle (PLAN 9.2/9.3).
"""

import pytest
from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from apps.chat.consumers import THROTTLE_MAX
from apps.chat.middleware import JWTAuthMiddleware
from apps.chat.models import ChatMessage
from apps.chat.routing import websocket_urlpatterns

# The chat stack minus the origin validator — isolates the consumer + JWT middleware (PLAN 9.1).
ws_app = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))


def _url(conversation_id, *, token: str | None) -> str:
    suffix = f"?token={token}" if token is not None else ""
    return f"/ws/chat/{conversation_id}/{suffix}"


async def _open(conversation_id, *, user=None, token=None):
    """Build and connect a communicator as ``user`` (or with a raw ``token``)."""
    if user is not None:
        token = str(AccessToken.for_user(user))
    communicator = WebsocketCommunicator(ws_app, _url(conversation_id, token=token))
    connected, code = await communicator.connect()
    return communicator, connected, code


@pytest.mark.django_db(transaction=True)
class TestConnection:
    def test_participant_client_connects(self, conversation, client_user):
        async def scenario():
            communicator, connected, _ = await _open(conversation.id, user=client_user)
            try:
                assert connected is True
            finally:
                await communicator.disconnect()

        async_to_sync(scenario)()

    def test_participant_host_connects(self, conversation, host_user):
        async def scenario():
            communicator, connected, _ = await _open(conversation.id, user=host_user)
            try:
                assert connected is True
            finally:
                await communicator.disconnect()

        async_to_sync(scenario)()

    def test_missing_token_is_rejected(self, conversation):
        async def scenario():
            communicator, connected, code = await _open(conversation.id, token=None)
            assert connected is False
            assert code == 4401

        async_to_sync(scenario)()

    def test_invalid_token_is_rejected(self, conversation):
        async def scenario():
            communicator, connected, code = await _open(conversation.id, token="not-a-jwt")
            assert connected is False
            assert code == 4401

        async_to_sync(scenario)()

    def test_blocked_account_is_rejected(self, conversation, client_user):
        # A token for a since-deactivated account resolves to AnonymousUser → 4401.
        token = str(AccessToken.for_user(client_user))
        client_user.is_active = False
        client_user.save(update_fields=["is_active"])

        async def scenario():
            communicator, connected, code = await _open(conversation.id, token=token)
            assert connected is False
            assert code == 4401

        async_to_sync(scenario)()

    def test_non_participant_is_rejected(self, conversation, other_client):
        async def scenario():
            communicator, connected, code = await _open(conversation.id, user=other_client)
            assert connected is False
            assert code == 4403

        async_to_sync(scenario)()

    def test_unknown_conversation_is_rejected(self, client_user):
        async def scenario():
            communicator, connected, code = await _open(999999, user=client_user)
            assert connected is False
            assert code == 4403

        async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
class TestMessaging:
    def test_send_persists_then_broadcasts_and_nudges_badge(
        self, conversation, client_user, host_user
    ):
        async def scenario():
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            host_ws, _, _ = await _open(conversation.id, user=host_user)
            try:
                await client_ws.send_json_to({"type": "message.send", "content": "Cześć!"})

                # The sender sees its own message echoed back (with the persisted id).
                echo = await client_ws.receive_json_from()
                assert echo["type"] == "message.new"
                assert echo["message"]["content"] == "Cześć!"
                assert echo["message"]["sender"] == client_user.id

                # The host receives the live message, then a badge nudge on its user group.
                live = await host_ws.receive_json_from()
                assert live["type"] == "message.new"
                assert live["message"]["id"] == echo["message"]["id"]

                badge = await host_ws.receive_json_from()
                assert badge["type"] == "conversation.updated"
                assert badge["conversation"] == conversation.id
            finally:
                await client_ws.disconnect()
                await host_ws.disconnect()

        async_to_sync(scenario)()

        conversation.refresh_from_db()
        assert ChatMessage.objects.filter(conversation=conversation).count() == 1
        assert conversation.last_message_at is not None

    def test_typing_is_broadcast_to_the_other_party(self, conversation, client_user, host_user):
        async def scenario():
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            host_ws, _, _ = await _open(conversation.id, user=host_user)
            try:
                await client_ws.send_json_to({"type": "typing", "state": True})
                frame = await host_ws.receive_json_from()
                assert frame == {"type": "typing", "user": client_user.id, "state": True}
            finally:
                await client_ws.disconnect()
                await host_ws.disconnect()

        async_to_sync(scenario)()

    def test_read_marks_messages_and_broadcasts_receipt(self, conversation, client_user, host_user):
        async def scenario():
            host_ws, _, _ = await _open(conversation.id, user=host_user)
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            try:
                await host_ws.send_json_to({"type": "message.send", "content": "Pytanie?"})
                # The host (sender) gets only its own echo; the badge goes to the client.
                await host_ws.receive_json_from()

                await client_ws.send_json_to({"type": "read"})
                receipt = await host_ws.receive_json_from()
                assert receipt["type"] == "read"
                assert receipt["user"] == client_user.id
                assert "at" in receipt
            finally:
                await host_ws.disconnect()
                await client_ws.disconnect()

        async_to_sync(scenario)()

        message = ChatMessage.objects.get(conversation=conversation)
        assert message.read_at is not None


@pytest.mark.django_db(transaction=True)
class TestValidationAndThrottle:
    def test_empty_message_returns_error(self, conversation, client_user):
        async def scenario():
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            try:
                await client_ws.send_json_to({"type": "message.send", "content": "   "})
                frame = await client_ws.receive_json_from()
                assert frame["type"] == "error"
                assert frame["code"] == "content_empty"
            finally:
                await client_ws.disconnect()

        async_to_sync(scenario)()
        assert ChatMessage.objects.filter(conversation=conversation).count() == 0

    def test_too_long_message_returns_error(self, conversation, client_user):
        async def scenario():
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            try:
                await client_ws.send_json_to({"type": "message.send", "content": "x" * 2001})
                frame = await client_ws.receive_json_from()
                assert frame["type"] == "error"
                assert frame["code"] == "content_too_long"
            finally:
                await client_ws.disconnect()

        async_to_sync(scenario)()
        assert ChatMessage.objects.filter(conversation=conversation).count() == 0

    def test_unknown_frame_type_returns_error(self, conversation, client_user):
        async def scenario():
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            try:
                await client_ws.send_json_to({"type": "bogus"})
                frame = await client_ws.receive_json_from()
                assert frame["type"] == "error"
                assert frame["code"] == "unknown_type"
            finally:
                await client_ws.disconnect()

        async_to_sync(scenario)()

    def test_throttle_blocks_a_flood(self, conversation, client_user):
        async def scenario():
            client_ws, _, _ = await _open(conversation.id, user=client_user)
            try:
                for _ in range(THROTTLE_MAX):
                    await client_ws.send_json_to({"type": "message.send", "content": "spam"})
                    frame = await client_ws.receive_json_from()
                    assert frame["type"] == "message.new"
                # One past the window's quota is refused.
                await client_ws.send_json_to({"type": "message.send", "content": "spam"})
                frame = await client_ws.receive_json_from()
                assert frame["type"] == "error"
                assert frame["code"] == "rate_limited"
            finally:
                await client_ws.disconnect()

        async_to_sync(scenario)()
        assert ChatMessage.objects.filter(conversation=conversation).count() == THROTTLE_MAX
