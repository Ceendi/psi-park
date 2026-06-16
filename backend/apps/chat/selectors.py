"""Read-side queries for chat (PLAN 5.1, 6.2, 15-B8).

The conversation list is the expensive one: it carries each thread's unread count and a
preview of the last line. Both are computed with correlated subqueries (not a join + GROUP BY)
so the whole list is one query plus the cover-photo prefetch — no N+1 (PLAN 12). History is a
plain keyset page over ``id`` (monotonic, so equivalent to "by time" but collision-free),
newest first; the view slices it to a page.
"""

from django.db.models import Count, IntegerField, OuterRef, Q, QuerySet, Subquery
from django.db.models.functions import Coalesce
from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.chat.models import ChatMessage, Conversation


def get_conversation_for_participant(*, conversation_id: int, user: User) -> Conversation:
    """Fetch a conversation the ``user`` takes part in, or 404 (privacy, PLAN 11).

    Joins the garden + host so the participant check and serialization need no extra query.
    A non-participant gets the same 404 as a missing row — existence is not leaked.
    """
    try:
        conversation = Conversation.objects.select_related("garden", "garden__host", "client").get(
            pk=conversation_id
        )
    except Conversation.DoesNotExist as exc:
        raise NotFound("Nie znaleziono konwersacji.") from exc
    if user.id not in (conversation.client_id, conversation.garden.host_id):
        raise NotFound("Nie znaleziono konwersacji.")
    return conversation


def participant_conversations(*, user: User) -> QuerySet[Conversation]:
    """Threads the ``user`` is in (as client or host), most recent first (PLAN 8.2).

    Each row is annotated with ``unread_count`` (messages from the other party not yet read)
    and a preview of the latest message, so the list renders without per-row queries.
    """
    latest = ChatMessage.objects.filter(conversation=OuterRef("pk")).order_by("-created_at", "-id")
    unread = (
        ChatMessage.objects.filter(conversation=OuterRef("pk"), read_at__isnull=True)
        .exclude(sender=user)
        .order_by()
        .values("conversation")
        .annotate(count=Count("*"))
        .values("count")
    )
    return (
        Conversation.objects.filter(Q(client=user) | Q(garden__host=user))
        .select_related("garden", "garden__host", "client")
        .prefetch_related("garden__photos")
        .annotate(
            unread_count=Coalesce(
                Subquery(unread, output_field=IntegerField()), 0, output_field=IntegerField()
            ),
            last_message_content=Subquery(latest.values("content")[:1]),
            last_message_sender_id=Subquery(latest.values("sender_id")[:1]),
            last_message_created_at=Subquery(latest.values("created_at")[:1]),
        )
        .order_by("-last_message_at", "-id")
    )


def message_history(*, conversation_id: int, before_id: int | None = None) -> QuerySet[ChatMessage]:
    """A conversation's messages, newest first, optionally older than ``before_id`` (PLAN 8.2).

    ``before_id`` is the keyset cursor: pass the oldest id already loaded to page backwards
    through history. The view applies the page-size slice; callers must scope the conversation
    to the participant first (``get_conversation_for_participant``).
    """
    queryset = ChatMessage.objects.filter(conversation_id=conversation_id).select_related("sender")
    if before_id is not None:
        queryset = queryset.filter(id__lt=before_id)
    return queryset.order_by("-id")
