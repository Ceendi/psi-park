"""Chat write operations (PLAN 5.1, 6.2, 15-B8).

Three use cases, each a keyword-only service function (PLAN 6.2): a client opens (or re-opens)
a thread with a garden, a participant posts a line, a participant marks the thread read. The
REST views call ``get_or_create_conversation``/``mark_read``; the websocket ``ChatConsumer``
calls ``post_message``/``mark_read`` through ``database_sync_to_async`` (persist → broadcast,
PLAN 9.3). Sending the live frames is the consumer's job — these functions only touch the DB.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.chat.models import MESSAGE_MAX_LENGTH, ChatMessage, Conversation
from apps.gardens.models import Garden


def is_participant(*, conversation: Conversation, user: User) -> bool:
    """True when ``user`` is the conversation's client or the garden's host (PLAN 9.1).

    Reads ``garden.host_id`` — callers that pass a conversation fetched without the garden
    joined trigger one extra query here, so the selectors ``select_related('garden')``.
    """
    return user.id in (conversation.client_id, conversation.garden.host_id)


@transaction.atomic
def get_or_create_conversation(*, client: User, garden_id: int) -> tuple[Conversation, bool]:
    """Return ``(thread, created)`` for the client ↔ ``garden_id`` pair (PLAN 8.2).

    Idempotent — the ``UniqueConstraint(garden, client)`` guarantees one thread per pair, so a
    repeated "Napisz do gospodarza" click returns the existing conversation (``created=False``).
    Only public (approved + active) gardens can be messaged.

    Raises:
        NotFound: the garden does not exist or is not publicly visible (privacy, PLAN 11).
    """
    try:
        garden = Garden.objects.get(
            id=garden_id,
            verification_status=Garden.Verification.APPROVED,
            is_active=True,
        )
    except Garden.DoesNotExist as exc:
        raise NotFound("Nie znaleziono ogrodu.") from exc
    return Conversation.objects.get_or_create(garden=garden, client=client)


@transaction.atomic
def post_message(*, conversation: Conversation, sender: User, content: str) -> ChatMessage:
    """Persist one message and bump the conversation's recency stamp (PLAN 9.3).

    Called from the consumer inside a single transaction so the row and the
    ``last_message_at`` update commit together, before the live broadcast.

    Raises:
        ValueError: ``sender`` is not a participant, or ``content`` is empty / too long.
    """
    if not is_participant(conversation=conversation, user=sender):
        raise ValueError("sender_not_participant")
    text = content.strip()
    if not text:
        raise ValueError("content_empty")
    if len(text) > MESSAGE_MAX_LENGTH:
        raise ValueError("content_too_long")
    message = ChatMessage.objects.create(conversation=conversation, sender=sender, content=text)
    Conversation.objects.filter(pk=conversation.pk).update(last_message_at=message.created_at)
    return message


def mark_read(*, conversation: Conversation, reader: User) -> int:
    """Stamp the other party's unread messages as read; return how many were updated (PLAN 8.2).

    Only messages *not* sent by ``reader`` count — you never mark your own as read. Idempotent:
    a second call updates nothing and returns 0.
    """
    return (
        ChatMessage.objects.filter(conversation=conversation, read_at__isnull=True)
        .exclude(sender=reader)
        .update(read_at=timezone.now())
    )
