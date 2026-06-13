"""Operational endpoints (no business domain)."""

import redis
from django.conf import settings
from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


def _database_ok() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except Exception:  # noqa: BLE001
        return False


def _redis_ok() -> bool:
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        return bool(client.ping())
    except Exception:  # noqa: BLE001
        return False


class HealthView(APIView):
    """Liveness/readiness probe used by the Docker healthcheck.

    Returns 200 only when the database and Redis are reachable, 503 otherwise.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []

    @extend_schema(
        responses=inline_serializer(
            name="HealthResponse",
            fields={
                "status": serializers.CharField(),
                "db": serializers.BooleanField(),
                "redis": serializers.BooleanField(),
            },
        )
    )
    def get(self, request: Request) -> Response:
        db_ok = _database_ok()
        redis_ok = _redis_ok()
        healthy = db_ok and redis_ok
        return Response(
            {"status": "ok" if healthy else "degraded", "db": db_ok, "redis": redis_ok},
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
