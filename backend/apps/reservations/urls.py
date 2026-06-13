"""Reservation routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``.

The ``export.csv`` route is registered before the ``<int:pk>`` routes for clarity (it can
never be captured as an id anyway). Payment/invoice/review sub-routes that hang off
``/reservations/{id}/`` belong to B5/B6/B7 and are added by those parts.
"""

from django.urls import path

from apps.reservations.views import (
    HostReservationAcceptView,
    HostReservationListView,
    HostReservationRejectView,
    HostScheduleView,
    HostStatsView,
    ReservationCancelView,
    ReservationCsvExportView,
    ReservationDetailView,
    ReservationListCreateView,
)

urlpatterns = [
    # Client
    path("reservations/", ReservationListCreateView.as_view(), name="reservation-list"),
    path("reservations/export.csv", ReservationCsvExportView.as_view(), name="reservation-export"),
    path("reservations/<int:pk>/", ReservationDetailView.as_view(), name="reservation-detail"),
    path(
        "reservations/<int:pk>/cancel/",
        ReservationCancelView.as_view(),
        name="reservation-cancel",
    ),
    # Host
    path("host/reservations/", HostReservationListView.as_view(), name="host-reservation-list"),
    path(
        "host/reservations/<int:pk>/accept/",
        HostReservationAcceptView.as_view(),
        name="host-reservation-accept",
    ),
    path(
        "host/reservations/<int:pk>/reject/",
        HostReservationRejectView.as_view(),
        name="host-reservation-reject",
    ),
    path("host/schedule/", HostScheduleView.as_view(), name="host-schedule"),
    path("host/stats/", HostStatsView.as_view(), name="host-stats"),
]
