"""Websocket URL routing for chat (PLAN 9.1).

``config.asgi`` wraps this list with ``JWTAuthMiddleware`` and the origin validator. Kept in
its own module (not ``urls.py``) so the HTTP and websocket route tables stay separate.
"""

from django.urls import path

from apps.chat.consumers import ChatConsumer

websocket_urlpatterns = [
    path("ws/chat/<int:conversation_id>/", ChatConsumer.as_asgi()),
]
