from unittest import mock

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_health_ok_when_dependencies_reachable():
    with mock.patch("apps.core.views._redis_ok", return_value=True):
        response = APIClient().get("/api/v1/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": True, "redis": True}


def test_health_degraded_when_redis_down():
    with mock.patch("apps.core.views._redis_ok", return_value=False):
        response = APIClient().get("/api/v1/health/")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["redis"] is False
