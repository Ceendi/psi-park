"""ASGI entrypoint.

Routes HTTP to the Django application and WebSocket through the chat stack: origin validation
→ ``JWTAuthMiddleware`` (resolves ``scope["user"]`` from the ``?token=`` access JWT, PLAN 9.1)
→ the chat ``URLRouter``. New websocket consumers register in ``apps.chat.routing``.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

from django.core.asgi import get_asgi_application  # noqa: E402

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from apps.chat.middleware import JWTAuthMiddleware  # noqa: E402
from apps.chat.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        ),
    }
)
