"""Chat REST routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``.

The live message stream is a websocket, not a route here — see ``chat.routing`` and
``chat.consumers`` (PLAN 9).
"""

from django.urls import path

from apps.chat.views import (
    ConversationListCreateView,
    ConversationReadView,
    MessageHistoryView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list"),
    path(
        "conversations/<int:pk>/messages/",
        MessageHistoryView.as_view(),
        name="conversation-messages",
    ),
    path("conversations/<int:pk>/read/", ConversationReadView.as_view(), name="conversation-read"),
]
