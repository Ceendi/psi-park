"""Thin chat views (PLAN 8.2 Czat).

Reads come from ``selectors`` (participant-scoped — a foreign conversation is a 404), the two
writes go through ``services``. Listing threads is open to either participant role; starting a
thread is client-only ("Napisz do gospodarza"). Messages are *not* posted here — they travel
over the websocket (PLAN 9); this layer only serves history and the read receipt.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat import selectors, services
from apps.chat.models import Conversation
from apps.chat.serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MarkReadResultSerializer,
    MessageHistorySerializer,
)
from apps.core.permissions import IsClient

# History is paged newest-first in chunks larger than the default list page — a chat scrollback
# loads many short lines at once (PLAN 8.2 cursor history).
MESSAGE_PAGE_SIZE = 30


class ConversationListCreateView(generics.ListCreateAPIView):
    """GET (either participant) lists threads; POST (client) starts/returns one (PLAN 8.2)."""

    def get_permissions(self):
        return [IsClient()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateSerializer
        return ConversationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Conversation.objects.none()
        return selectors.participant_conversations(user=self.request.user)

    @extend_schema(request=ConversationCreateSerializer, responses={201: ConversationSerializer})
    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation, created = services.get_or_create_conversation(
            client=request.user, garden_id=serializer.validated_data["garden"]
        )
        # Re-fetch through the selector so the response carries unread_count / last_message.
        row = selectors.participant_conversations(user=request.user).get(pk=conversation.pk)
        return Response(
            ConversationSerializer(row, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MessageHistoryView(APIView):
    """GET /conversations/{id}/messages/?before= — keyset history, newest first (PLAN 8.2)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "before",
                OpenApiTypes.INT,
                description="Return messages older than this message id (keyset cursor).",
            )
        ],
        responses=MessageHistorySerializer,
    )
    def get(self, request: Request, pk: int) -> Response:
        # 404s for a non-participant before any message is read (privacy, PLAN 11).
        selectors.get_conversation_for_participant(conversation_id=pk, user=request.user)
        before_id = self._parse_before(request)
        window = list(
            selectors.message_history(conversation_id=pk, before_id=before_id)[
                : MESSAGE_PAGE_SIZE + 1
            ]
        )
        has_more = len(window) > MESSAGE_PAGE_SIZE
        page = window[:MESSAGE_PAGE_SIZE]
        next_before = page[-1].id if (has_more and page) else None
        payload = {"results": page, "has_more": has_more, "next_before": next_before}
        return Response(MessageHistorySerializer(payload, context={"request": request}).data)

    @staticmethod
    def _parse_before(request: Request) -> int | None:
        raw = request.query_params.get("before")
        if raw in (None, ""):
            return None
        try:
            return int(raw)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"before": ["Kursor musi być liczbą całkowitą."]}) from exc


class ConversationReadView(APIView):
    """POST /conversations/{id}/read/ — mark the other party's messages read (PLAN 8.2)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=MarkReadResultSerializer)
    def post(self, request: Request, pk: int) -> Response:
        conversation = selectors.get_conversation_for_participant(
            conversation_id=pk, user=request.user
        )
        marked = services.mark_read(conversation=conversation, reader=request.user)
        return Response(MarkReadResultSerializer({"marked_read": marked}).data)
