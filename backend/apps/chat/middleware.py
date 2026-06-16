"""ASGI auth middleware for the chat websocket (PLAN 9.1).

Browsers cannot set an ``Authorization`` header on a ``WebSocket`` handshake, so the access
JWT travels in the query string (``?token=<access_jwt>``). This middleware validates it with
the same simplejwt machinery the REST API uses and puts the user on ``scope["user"]`` — an
``AnonymousUser`` when the token is missing, malformed, expired or points at a blocked account.
The consumer makes the participant decision; the middleware only resolves identity.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User


@database_sync_to_async
def _get_active_user(user_id: int) -> User | AnonymousUser:
    """Load the active account behind a token's ``user_id`` claim (blocked ⇒ anonymous)."""
    try:
        return User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Resolve ``scope["user"]`` from a ``?token=`` access JWT on the websocket handshake."""

    async def __call__(self, scope, receive, send):
        scope["user"] = await self._authenticate(scope)
        return await super().__call__(scope, receive, send)

    async def _authenticate(self, scope) -> User | AnonymousUser:
        token = self._token_from_scope(scope)
        if not token:
            return AnonymousUser()
        try:
            access = AccessToken(token)
        except TokenError:
            return AnonymousUser()
        return await _get_active_user(access["user_id"])

    @staticmethod
    def _token_from_scope(scope) -> str | None:
        query = parse_qs(scope.get("query_string", b"").decode())
        tokens = query.get("token")
        return tokens[0] if tokens else None
