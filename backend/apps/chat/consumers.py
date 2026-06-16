"""The chat websocket consumer (PLAN 9).

One socket per conversation (``ws/chat/{id}/``). On connect the consumer confirms the
``scope["user"]`` (set by ``JWTAuthMiddleware``) is a participant, then joins two Redis groups:
``chat_{id}`` for this thread's live frames and ``user_{id}`` so the other party's open sockets
get a badge nudge when a new message lands. Inbound frames follow PLAN 9.2; a sent message is
persisted *before* it is broadcast (PLAN 9.3), and a simple sliding window throttles floods.
"""

import time
from collections import deque

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.chat import selectors, services
from apps.chat.models import MESSAGE_MAX_LENGTH

# Sliding-window throttle: at most THROTTLE_MAX message.send frames per THROTTLE_WINDOW s (9.3).
THROTTLE_MAX = 5
THROTTLE_WINDOW = 2.0

# Application close codes (4000-4999 are free for app use, RFC 6455).
CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Live message stream for a single conversation between its two participants."""

    async def connect(self) -> None:
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return
        self.user = user
        self.conversation_id = int(self.scope["url_route"]["kwargs"]["conversation_id"])
        self.conversation = await self._load_conversation()
        if self.conversation is None:
            await self.close(code=CLOSE_FORBIDDEN)
            return
        self.group_name = f"chat_{self.conversation_id}"
        self.user_group = f"user_{user.id}"
        self._send_times: deque[float] = deque()
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

    async def disconnect(self, code) -> None:
        # The groups are only joined once the participant check passes (see connect).
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive_json(self, content, **kwargs) -> None:
        handlers = {
            "message.send": self._handle_send,
            "typing": self._handle_typing,
            "read": self._handle_read,
        }
        handler = handlers.get(content.get("type"))
        if handler is None:
            await self._error("unknown_type", "Nieznany typ ramki.")
            return
        await handler(content)

    # -- inbound frame handlers -------------------------------------------------------------

    async def _handle_send(self, content: dict) -> None:
        text = (content.get("content") or "").strip()
        if not text:
            await self._error("content_empty", "Wiadomość nie może być pusta.")
            return
        if len(text) > MESSAGE_MAX_LENGTH:
            await self._error(
                "content_too_long", f"Maksymalna długość wiadomości to {MESSAGE_MAX_LENGTH} znaków."
            )
            return
        if not self._allow_send():
            await self._error("rate_limited", "Zbyt wiele wiadomości. Zwolnij tempo.")
            return
        message = await self._persist(text)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": {
                    "id": message.id,
                    "sender": message.sender_id,
                    "content": message.content,
                    "created_at": message.created_at.isoformat(),
                },
            },
        )
        # Nudge the other participant's conversation list (badge), wherever they are connected.
        await self.channel_layer.group_send(
            f"user_{self._counterparty_id()}",
            {
                "type": "conversation.updated",
                "conversation": self.conversation_id,
                "last_message_at": message.created_at.isoformat(),
            },
        )

    async def _handle_typing(self, content: dict) -> None:
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.typing", "user": self.user.id, "state": bool(content.get("state"))},
        )

    async def _handle_read(self, content: dict) -> None:
        await self._mark_read()
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.read", "user": self.user.id, "at": timezone.now().isoformat()},
        )

    # -- group event handlers (fan-out to this socket) --------------------------------------

    async def chat_message(self, event: dict) -> None:
        await self.send_json({"type": "message.new", "message": event["message"]})

    async def chat_typing(self, event: dict) -> None:
        await self.send_json({"type": "typing", "user": event["user"], "state": event["state"]})

    async def chat_read(self, event: dict) -> None:
        await self.send_json({"type": "read", "user": event["user"], "at": event["at"]})

    async def conversation_updated(self, event: dict) -> None:
        await self.send_json(
            {
                "type": "conversation.updated",
                "conversation": event["conversation"],
                "last_message_at": event["last_message_at"],
            }
        )

    # -- helpers ----------------------------------------------------------------------------

    def _allow_send(self) -> bool:
        """True if a new message is within the per-window quota; records it when so (9.3)."""
        now = time.monotonic()
        window = self._send_times
        while window and now - window[0] > THROTTLE_WINDOW:
            window.popleft()
        if len(window) >= THROTTLE_MAX:
            return False
        window.append(now)
        return True

    def _counterparty_id(self) -> int:
        """The other participant's id (host for a client sender, client for a host sender)."""
        client_id = self.conversation.client_id
        host_id = self.conversation.garden.host_id
        return host_id if self.user.id == client_id else client_id

    async def _error(self, code: str, detail: str) -> None:
        await self.send_json({"type": "error", "code": code, "detail": detail})

    @database_sync_to_async
    def _load_conversation(self):
        """Return the conversation if the user is a participant, else ``None`` (→ 4403)."""
        try:
            return selectors.get_conversation_for_participant(
                conversation_id=self.conversation_id, user=self.user
            )
        except NotFound:
            return None

    @database_sync_to_async
    def _persist(self, text: str):
        return services.post_message(conversation=self.conversation, sender=self.user, content=text)

    @database_sync_to_async
    def _mark_read(self) -> int:
        return services.mark_read(conversation=self.conversation, reader=self.user)
