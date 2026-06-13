"""Shared fixtures for accounts tests."""

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """Reset the cache around every test so throttle counters never leak between tests.

    Throttling stores request counts in the default cache (a process-wide LocMemCache),
    which otherwise persists across tests and makes auth-scope tests order-dependent.
    """
    cache.clear()
    yield
    cache.clear()
