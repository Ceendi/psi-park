"""Serializers for the chat REST API (PLAN 6.1 ISP, 8.2 Czat).

Read shapes only — messages are *sent* over the websocket (PLAN 9), so there is no message
write serializer here. The conversation row carries both participants (the frontend knows its
own role and picks the counterparty), the garden card, the unread badge and a one-line preview
of the last message built from the selector's annotations. History returns a keyset page.
"""

from rest_framework import serializers

from apps.accounts.models import User
from apps.chat.models import ChatMessage, Conversation
from apps.gardens.models import Garden


class ChatParticipantSerializer(serializers.ModelSerializer):
    """Public-facing identity of a conversation participant (client or host)."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name"]
        read_only_fields = fields


class ChatGardenSerializer(serializers.ModelSerializer):
    """Compact garden card embedded in a conversation row (its host is the counterparty)."""

    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Garden
        fields = ["id", "title", "city", "cover_image"]
        read_only_fields = fields

    def get_cover_image(self, obj: Garden) -> str | None:
        photos = list(obj.photos.all())  # prefetched, ordered by position
        if not photos:
            return None
        file = photos[0].thumbnail or photos[0].image
        if not file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class ChatMessageSerializer(serializers.ModelSerializer):
    """A single message (PLAN 7.8). ``sender``/``conversation`` serialise as their ids."""

    class Meta:
        model = ChatMessage
        fields = ["id", "conversation", "sender", "content", "read_at", "created_at"]
        read_only_fields = fields


class LastMessagePreviewSerializer(serializers.Serializer):
    """One-line preview of a thread's most recent message, built from selector annotations."""

    content = serializers.CharField(read_only=True)
    sender = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ConversationSerializer(serializers.ModelSerializer):
    """A conversation row for the participant's list (PLAN 8.2).

    ``unread_count`` and ``last_message`` come from ``selectors.participant_conversations``;
    on a freshly created thread (no messages yet) ``last_message`` is ``null``.
    """

    garden = ChatGardenSerializer(read_only=True)
    client = ChatParticipantSerializer(read_only=True)
    host = ChatParticipantSerializer(source="garden.host", read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "garden",
            "client",
            "host",
            "unread_count",
            "last_message",
            "last_message_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_last_message(self, obj: Conversation) -> dict | None:
        content = getattr(obj, "last_message_content", None)
        if content is None:
            return None
        return LastMessagePreviewSerializer(
            {
                "content": content,
                "sender": getattr(obj, "last_message_sender_id", None),
                "created_at": getattr(obj, "last_message_created_at", None),
            }
        ).data


class ConversationCreateSerializer(serializers.Serializer):
    """Body of "start a conversation" (PLAN 8.2): just the garden to message."""

    garden = serializers.IntegerField(min_value=1)


class MessageHistorySerializer(serializers.Serializer):
    """Keyset page of history (PLAN 8.2): newest-first messages + the cursor for older ones."""

    results = ChatMessageSerializer(many=True, read_only=True)
    has_more = serializers.BooleanField(read_only=True)
    next_before = serializers.IntegerField(read_only=True, allow_null=True)


class MarkReadResultSerializer(serializers.Serializer):
    """Response of the read endpoint (PLAN 8.2): how many messages were just marked read."""

    marked_read = serializers.IntegerField(read_only=True)
