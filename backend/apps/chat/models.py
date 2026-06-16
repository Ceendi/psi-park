"""Chat models — a conversation between a client and a host's garden (PLAN 7.8, K-4, AD-10).

A ``Conversation`` is the client ↔ garden pair (the host is implied by ``garden.host``), so a
client can message a host straight from a garden page — before any reservation exists. Messages
hang off the conversation; the live stream is the ``ChatConsumer``'s job (PLAN 9), history is
served over REST (PLAN 8.2). Read state lives on each message (``read_at``) so the unread badge
is a simple count, never a denormalised counter.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel

# Hard cap mirrored by the serializer and the consumer (PLAN 9.3). A message is a chat line,
# not an essay; bounding it also caps the websocket frame size.
MESSAGE_MAX_LENGTH = 2000


class Conversation(TimeStampedModel):
    """One thread between a ``client`` and a ``garden`` (its host is the other party).

    ``UniqueConstraint(garden, client)`` keeps it to a single thread per pair — the service
    does ``get_or_create`` against it (PLAN 8.2). ``last_message_at`` is denormalised purely
    to sort the conversation list cheaply; it is updated whenever a message is posted.
    """

    garden = models.ForeignKey(
        "gardens.Garden",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        # Most-recently-active first; the sort key matches the list index below.
        ordering = ["-last_message_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["garden", "client"], name="conversation_unique_garden_client"
            ),
        ]
        indexes = [
            # Backs the participant conversation list ordered by recency (PLAN 12).
            models.Index(fields=["client", "last_message_at"], name="conversation_client_recent"),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} garden={self.garden_id} client={self.client_id}"


class ChatMessage(TimeStampedModel):
    """A single line in a conversation, sent by one of its two participants (PLAN 7.8).

    ``sender`` must be the conversation's ``client`` or its ``garden.host`` — enforced in
    ``chat.services``/the consumer, not by a DB constraint (it spans a relation). ``read_at``
    is stamped when the *other* party marks the thread read; ``null`` means unread.
    """

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    content = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            # Backs history pagination and the unread count (PLAN 12).
            models.Index(fields=["conversation", "created_at"], name="message_conv_created"),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} conv={self.conversation_id} sender={self.sender_id}"
