"""Thin reservation views (PLAN 8.2).

Reads come from ``selectors`` (participant/owner scoped → 404 for foreign ids), writes go
through ``services`` (the state machine + side effects). Client endpoints require the
client role, ``/host/...`` endpoints the host role; the shared detail endpoint is open to
either participant and relies on the selector to hide non-participants.
"""

import csv
from datetime import datetime, time

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsClient, IsHost
from apps.reservations import selectors, services
from apps.reservations.models import Reservation
from apps.reservations.serializers import (
    CancelResultSerializer,
    HostStatsSerializer,
    ReservationCreateSerializer,
    ReservationDetailSerializer,
    ReservationListSerializer,
    ReservationRejectSerializer,
    ScheduleEventSerializer,
)

# --- client ---------------------------------------------------------------------------


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "status_group",
                str,
                enum=list(selectors.CLIENT_STATUS_GROUPS),
                description="Panel tab filter.",
            )
        ]
    ),
    post=extend_schema(
        request=ReservationCreateSerializer, responses={201: ReservationDetailSerializer}
    ),
)
class ReservationListCreateView(generics.ListCreateAPIView):
    """GET /reservations/ — the client's own bookings; POST — create one (pending_payment)."""

    permission_classes = [IsClient]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Reservation.objects.none()
        group = self.request.query_params.get("status_group")
        _validate_group(group, selectors.CLIENT_STATUS_GROUPS)
        return selectors.client_reservations(client=self.request.user, status_group=group)

    def get_serializer_class(self):
        return (
            ReservationCreateSerializer
            if self.request.method == "POST"
            else ReservationListSerializer
        )

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = ReservationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        reservation = services.create_reservation(
            client=request.user,
            garden_id=data["garden"],
            dog_id=data["dog"],
            start_time=data["start_time"],
            end_time=data["end_time"],
            dogs_count=data["dogs_count"],
            message_to_host=data["message_to_host"],
        )
        reservation = selectors.participant_reservations(user=request.user).get(pk=reservation.pk)
        return Response(
            ReservationDetailSerializer(reservation, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class ReservationDetailView(generics.RetrieveAPIView):
    """GET /reservations/{id}/ — detail for a participant (client or the garden's host)."""

    permission_classes = [IsAuthenticated]
    serializer_class = ReservationDetailSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Reservation.objects.none()
        return selectors.participant_reservations(user=self.request.user)


class ReservationCancelView(APIView):
    """POST /reservations/{id}/cancel/ — client cancels; response carries ``refunded``."""

    permission_classes = [IsClient]

    @extend_schema(request=None, responses=CancelResultSerializer)
    def post(self, request: Request, pk: int) -> Response:
        reservation, refunded = services.cancel_reservation(client=request.user, reservation_id=pk)
        reservation = selectors.participant_reservations(user=request.user).get(pk=reservation.pk)
        payload = {
            "refunded": refunded,
            "reservation": ReservationDetailSerializer(
                reservation, context={"request": request}
            ).data,
        }
        return Response(payload)


class ReservationCsvExportView(APIView):
    """GET /reservations/export.csv — the client's reservations as a CSV download."""

    permission_classes = [IsClient]

    _HEADER = [
        "id",
        "ogrod",
        "miasto",
        "pies",
        "poczatek",
        "koniec",
        "status",
        "wartosc_najmu",
        "prowizja",
        "razem",
        "utworzono",
    ]

    @extend_schema(responses={(200, "text/csv"): OpenApiTypes.BINARY})
    def get(self, request: Request) -> HttpResponse:
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="rezerwacje.csv"'
        response.write("﻿")  # BOM so Excel reads the Polish characters as UTF-8
        writer = csv.writer(response)
        writer.writerow(self._HEADER)
        for r in selectors.client_reservations(client=request.user):
            writer.writerow(
                [
                    r.id,
                    r.garden.title,
                    r.garden.city,
                    r.dog.name,
                    _local(r.start_time),
                    _local(r.end_time),
                    r.get_status_display(),
                    r.subtotal,
                    r.service_fee,
                    r.total_price,
                    _local(r.created_at),
                ]
            )
        return response


# --- host -----------------------------------------------------------------------------


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "status_group",
                str,
                enum=list(selectors.HOST_STATUS_GROUPS),
                description="Panel tab filter.",
            ),
            OpenApiParameter("garden", int, description="Restrict to one of the host's gardens."),
        ]
    )
)
class HostReservationListView(generics.ListAPIView):
    """GET /host/reservations/ — reservations on the host's gardens (paid only)."""

    permission_classes = [IsHost]
    serializer_class = ReservationListSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Reservation.objects.none()
        group = self.request.query_params.get("status_group")
        _validate_group(group, selectors.HOST_STATUS_GROUPS)
        return selectors.host_reservations(
            host=self.request.user,
            status_group=group,
            garden_id=_int_param(self.request, "garden"),
        )


class HostReservationAcceptView(APIView):
    """POST /host/reservations/{id}/accept/ — ``awaiting_host → confirmed`` + e-mail."""

    permission_classes = [IsHost]

    @extend_schema(request=None, responses=ReservationDetailSerializer)
    def post(self, request: Request, pk: int) -> Response:
        services.accept_reservation(host=request.user, reservation_id=pk)
        return _detail_response(request, pk)


class HostReservationRejectView(APIView):
    """POST /host/reservations/{id}/reject/ — ``awaiting_host → rejected`` + refund + e-mail."""

    permission_classes = [IsHost]

    @extend_schema(request=ReservationRejectSerializer, responses=ReservationDetailSerializer)
    def post(self, request: Request, pk: int) -> Response:
        serializer = ReservationRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reject_reservation(
            host=request.user, reservation_id=pk, reason=serializer.validated_data["reason"]
        )
        return _detail_response(request, pk)


class HostScheduleView(APIView):
    """GET /host/schedule/?from=&to=&garden= — committed reservations as calendar events."""

    permission_classes = [IsHost]

    @extend_schema(
        parameters=[
            OpenApiParameter("from", str, required=True, description="YYYY-MM-DD (inclusive)."),
            OpenApiParameter("to", str, required=True, description="YYYY-MM-DD (inclusive)."),
            OpenApiParameter("garden", int, description="Restrict to one of the host's gardens."),
        ],
        responses=ScheduleEventSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        start = _parse_day(request, "from", at_day_start=True)
        end = _parse_day(request, "to", at_day_start=False)
        events = selectors.host_schedule(
            host=request.user,
            start=start,
            end=end,
            garden_id=_int_param(request, "garden"),
        )
        return Response(ScheduleEventSerializer(events, many=True).data)


class HostStatsView(APIView):
    """GET /host/stats/ — dashboard tiles (counts, earnings, average rating)."""

    permission_classes = [IsHost]

    @extend_schema(responses=HostStatsSerializer)
    def get(self, request: Request) -> Response:
        return Response(HostStatsSerializer(selectors.host_stats(host=request.user)).data)


# --- helpers --------------------------------------------------------------------------


def _validate_group(group: str | None, allowed: tuple[str, ...]) -> None:
    if group and group not in allowed:
        raise ValidationError({"status_group": [f"Dozwolone wartości: {', '.join(allowed)}."]})


def _int_param(request: Request, name: str) -> int | None:
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except ValueError as exc:
        raise ValidationError({name: ["Wartość musi być liczbą całkowitą."]}) from exc


def _parse_day(request: Request, name: str, *, at_day_start: bool) -> datetime:
    """Parse a ``YYYY-MM-DD`` query param into an aware day boundary (inclusive range).

    ``from`` maps to the start of its day and ``to`` to the very end, so the window
    ``[from 00:00, to 23:59:59]`` covers both endpoint days fully.
    """
    raw = request.query_params.get(name)
    try:
        day = datetime.strptime(raw, "%Y-%m-%d").date()
    except (TypeError, ValueError) as exc:
        raise ValidationError({name: ["Podaj datę w formacie YYYY-MM-DD."]}) from exc
    moment = time.min if at_day_start else time.max
    return timezone.make_aware(datetime.combine(day, moment), timezone.get_current_timezone())


def _local(value: datetime) -> str:
    return timezone.localtime(value).strftime("%Y-%m-%d %H:%M")


def _detail_response(request: Request, pk: int) -> Response:
    reservation = get_object_or_404(selectors.participant_reservations(user=request.user), pk=pk)
    return Response(ReservationDetailSerializer(reservation, context={"request": request}).data)
