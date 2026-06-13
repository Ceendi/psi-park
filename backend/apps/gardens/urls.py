"""Garden routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``.

The public ``GET /gardens/{id}/reviews/`` row in PLAN 8.2 is intentionally deferred to
B7: it needs the Review model + serializer (owned by B7) and its JSON shape is not fixed
in PLAN 8.3, so wiring it here would mean inventing the review contract (README).
"""

from django.urls import path

from apps.gardens.views import (
    GardenAvailabilityView,
    GardenDetailView,
    GardenListView,
    HostGardenDetailView,
    HostGardenListCreateView,
    HostGardenPhotoCreateView,
    HostGardenPhotoDeleteView,
    HostGardenPhotoReorderView,
)

urlpatterns = [
    # Public
    path("gardens/", GardenListView.as_view(), name="garden-list"),
    path("gardens/<int:pk>/", GardenDetailView.as_view(), name="garden-detail"),
    path(
        "gardens/<int:pk>/availability/",
        GardenAvailabilityView.as_view(),
        name="garden-availability",
    ),
    # Host
    path("host/gardens/", HostGardenListCreateView.as_view(), name="host-garden-list"),
    path("host/gardens/<int:pk>/", HostGardenDetailView.as_view(), name="host-garden-detail"),
    path(
        "host/gardens/<int:pk>/photos/",
        HostGardenPhotoCreateView.as_view(),
        name="host-garden-photos",
    ),
    # "reorder" before the {photo_id} route so it is never captured as an id.
    path(
        "host/gardens/<int:pk>/photos/reorder/",
        HostGardenPhotoReorderView.as_view(),
        name="host-garden-photo-reorder",
    ),
    path(
        "host/gardens/<int:pk>/photos/<int:photo_id>/",
        HostGardenPhotoDeleteView.as_view(),
        name="host-garden-photo-detail",
    ),
]
