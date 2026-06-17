"""Thin admin-panel views (PLAN 8.2 Admin, AD-12).

Every endpoint requires the admin role (``IsAdmin``). Reads come from ``selectors`` (with
the shared list filters/search), writes go through ``services`` (which own the state change
plus the host e-mail). The React admin panel (F8) and the Django Admin both drive the same
service layer, so the two surfaces never diverge.
"""

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.adminpanel import selectors, services
from apps.adminpanel.filters import AdminGardenFilter, AdminReviewFilter, AdminUserFilter
from apps.adminpanel.serializers import (
    AdminGardenSerializer,
    AdminReviewSerializer,
    AdminUserSerializer,
    GardenRejectSerializer,
)
from apps.core.permissions import IsAdmin
from apps.gardens.models import Garden
from apps.reviews.models import Review

# --- gardens: verification queue ------------------------------------------------------


class AdminGardenListView(generics.ListAPIView):
    """GET /admin/gardens/?status=pending — the verification queue (any status, filterable)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminGardenSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = AdminGardenFilter
    search_fields = ["title", "city", "host__email"]
    ordering_fields = ["created_at", "price_per_hour"]
    ordering = ["created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Garden.objects.none()
        return selectors.admin_gardens(admin=self.request.user)


class AdminGardenApproveView(APIView):
    """POST /admin/gardens/{id}/approve/ — publish the garden + e-mail the host."""

    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses=AdminGardenSerializer)
    def post(self, request: Request, pk: int) -> Response:
        services.approve_garden(garden_id=pk)
        garden = selectors.admin_gardens(admin=request.user).get(pk=pk)
        return Response(AdminGardenSerializer(garden, context={"request": request}).data)


class AdminGardenRejectView(APIView):
    """POST /admin/gardens/{id}/reject/ — reject with a reason + e-mail the host."""

    permission_classes = [IsAdmin]

    @extend_schema(request=GardenRejectSerializer, responses=AdminGardenSerializer)
    def post(self, request: Request, pk: int) -> Response:
        serializer = GardenRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reject_garden(garden_id=pk, reason=serializer.validated_data["reason"])
        garden = selectors.admin_gardens(admin=request.user).get(pk=pk)
        return Response(AdminGardenSerializer(garden, context={"request": request}).data)


# --- users ----------------------------------------------------------------------------


class AdminUserListView(generics.ListAPIView):
    """GET /admin/users/ — all accounts, filterable by role/active and searchable."""

    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = AdminUserFilter
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created_at", "email"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return selectors.admin_users()


class AdminUserVerifyView(APIView):
    """POST /admin/users/{id}/verify/ — mark a host as verified (badge) + e-mail."""

    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses=AdminUserSerializer)
    def post(self, request: Request, pk: int) -> Response:
        user = services.verify_host(user_id=pk)
        return Response(AdminUserSerializer(user).data)


class AdminUserBlockView(APIView):
    """POST /admin/users/{id}/block/ — deactivate the account (``is_active=False``)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses=AdminUserSerializer)
    def post(self, request: Request, pk: int) -> Response:
        user = services.block_user(user_id=pk)
        return Response(AdminUserSerializer(user).data)


class AdminUserUnblockView(APIView):
    """POST /admin/users/{id}/unblock/ — re-activate the account (``is_active=True``)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses=AdminUserSerializer)
    def post(self, request: Request, pk: int) -> Response:
        user = services.unblock_user(user_id=pk)
        return Response(AdminUserSerializer(user).data)


# --- reviews: moderation --------------------------------------------------------------


class AdminReviewListView(generics.ListAPIView):
    """GET /admin/reviews/ — all reviews for moderation, newest first (filter by garden/rating)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminReviewSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = AdminReviewFilter
    search_fields = ["comment", "author__email", "garden__title"]
    ordering_fields = ["created_at", "rating"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        return selectors.admin_reviews()


class AdminReviewDeleteView(APIView):
    """DELETE /admin/reviews/{id}/ — remove a violating review (moderation)."""

    permission_classes = [IsAdmin]

    @extend_schema(responses={204: None})
    def delete(self, request: Request, pk: int) -> Response:
        services.delete_review(review_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
