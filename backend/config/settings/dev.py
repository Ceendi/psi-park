"""Development settings: verbose, browsable, served by runserver (Daphne/ASGI)."""

from .base import *  # noqa: F403

DEBUG = True

# Convenience: allow any host in local dev.
ALLOWED_HOSTS = ["*"]

# Browsable API is handy while developing.
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)
