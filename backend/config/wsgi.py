"""WSGI entrypoint (kept for tooling that expects it; ASGI is the primary server)."""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
