"""Thin review views (PLAN 8.2 Recenzje).

Reads come from ``selectors`` (public for the garden list/detail, author-scoped for the
owner's edit/delete → 404 for a foreign id), writes go through ``services`` (which owns the
eligibility rule). Creating and listing eligible stays require the client role; the public
garden-review list and the single-review detail are open to anyone.
"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsClient
from apps.reservations.models import Reservation
from apps.reviews import selectors, services
from apps.reviews.models import Review
from apps.reviews.serializers import (
    EligibleReservationSerializer,
    ReviewSerializer,
    ReviewWriteSerializer,
)


class ReservationReviewCreateView(APIView):
    """POST /reservations/{id}/review/ — the owning client reviews a completed stay."""

    permission_classes = [IsClient]

    @extend_schema(request=ReviewWriteSerializer, responses={201: ReviewSerializer})
    def post(self, request: Request, pk: int) -> Response:
        serializer = ReviewWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = services.create_review(
            client=request.user,
            reservation_id=pk,
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data["comment"],
        )
        review = selectors.review_detail_qs().get(pk=review.pk)
        return Response(
            ReviewSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(responses=ReviewSerializer),
    patch=extend_schema(request=ReviewWriteSerializer, responses=ReviewSerializer),
    delete=extend_schema(responses={204: None}),
)
class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET (public) / PATCH / DELETE /reviews/{id}/ — read any, edit/delete only your own."""

    # Partial updates only; full-replacement PUT is not part of the contract (PLAN 8.2).
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_permissions(self):
        return [AllowAny()] if self.request.method in ("GET", "HEAD") else [IsClient()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        if self.request.method in ("GET", "HEAD"):
            return selectors.review_detail_qs()
        return selectors.owned_reviews(author=self.request.user)

    def get_serializer_class(self):
        return ReviewWriteSerializer if self.request.method == "PATCH" else ReviewSerializer

    def update(self, request: Request, *args, **kwargs) -> Response:
        review = self.get_object()
        serializer = ReviewWriteSerializer(instance=review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        review = services.update_review(review=review, data=serializer.validated_data)
        return Response(ReviewSerializer(review, context=self.get_serializer_context()).data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        services.delete_review(review=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class EligibleReservationListView(generics.ListAPIView):
    """GET /reviews/eligible/ — the client's completed stays still awaiting a review."""

    permission_classes = [IsClient]
    serializer_class = EligibleReservationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Reservation.objects.none()
        return selectors.eligible_reservations(client=self.request.user)


class GardenReviewListView(generics.ListAPIView):
    """GET /gardens/{id}/reviews/ — a garden's public reviews, newest first (PLAN 8.2)."""

    permission_classes = [AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        return selectors.garden_reviews(garden_id=self.kwargs["pk"])
