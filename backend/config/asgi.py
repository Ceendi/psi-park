"""ASGI entrypoint.

Routes HTTP to the Django application and WebSocket to a Channels router. The
WebSocket routing list is intentionally empty here — part B8 (chat) plugs its
consumers and JWT auth middleware in without touching this file's structure.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

from django.core.asgi import get_asgi_application  # noqa: E402

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

# B8 appends (path(...), Consumer.as_asgi()) entries to this list.
websocket_urlpatterns: list = []

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(URLRouter(websocket_urlpatterns)),
    }
)
