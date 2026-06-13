"""Test settings: fast hashing, local-memory e-mail and channel layer, no throttling."""

from .base import *  # noqa: F403

DEBUG = False

# Speed up the test suite — Argon2 is deliberately slow.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Capture e-mails in memory instead of hitting SMTP.
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# In-process channel layer so unit tests don't require a running Redis.
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# Effectively disable throttling so tests are deterministic. Rates stay defined (not
# emptied) because ScopedRateThrottle raises ImproperlyConfigured on an unknown scope;
# the auth-throttle test lowers the "auth" rate locally by patching the throttle (B1).
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ()  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "100000/min",
    "user": "100000/min",
    "auth": "100000/min",
}
