"""Review routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``.

``reservations/{id}/review/`` and ``gardens/{id}/reviews/`` hang off other apps' resources —
the reservations and gardens apps deliberately left these review sub-routes to B7 (see their
``urls.py``). ``reviews/eligible/`` is registered before ``reviews/{id}/`` for clarity.
"""

from django.urls import path

from apps.reviews.views import (
    EligibleReservationListView,
    GardenReviewListView,
    ReservationReviewCreateView,
    ReviewDetailView,
)

urlpatterns = [
    path(
        "reservations/<int:pk>/review/",
        ReservationReviewCreateView.as_view(),
        name="reservation-review",
    ),
    path("reviews/eligible/", EligibleReservationListView.as_view(), name="review-eligible"),
    path("reviews/<int:pk>/", ReviewDetailView.as_view(), name="review-detail"),
    path("gardens/<int:pk>/reviews/", GardenReviewListView.as_view(), name="garden-reviews"),
]
