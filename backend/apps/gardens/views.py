"""Thin garden views (PLAN 8.2).

Reads come from ``selectors`` (visibility/ownership scoped → 404 for hidden or foreign
ids), writes go through ``services``. Public list/detail/availability are open; the
``/host/...`` endpoints require the host role and own the garden.
"""

from datetime import datetime

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsHost
from apps.gardens import selectors, services
from apps.gardens.filters import GardenFilter
from apps.gardens.models import Garden
from apps.gardens.permissions import IsHostOfGarden
from apps.gardens.serializers import (
    AvailabilitySerializer,
    GardenDetailSerializer,
    GardenListSerializer,
    GardenPhotoSerializer,
    GardenPhotoUploadSerializer,
    GardenWriteSerializer,
    PhotoReorderSerializer,
)

# --- public ---------------------------------------------------------------------------


class GardenListView(generics.ListAPIView):
    """GET /gardens/ — public catalogue of approved, active gardens with filters/sort."""

    permission_classes = [AllowAny]
    serializer_class = GardenListSerializer
    queryset = selectors.public_garden_list()
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = GardenFilter
    ordering_fields = ["price_per_hour", "rating_avg", "created_at"]
    ordering = ["-created_at"]


class GardenDetailView(generics.RetrieveAPIView):
    """GET /gardens/{id}/ — public detail; owner/admin may also open their pending garden."""

    permission_classes = [AllowAny]
    serializer_class = GardenDetailSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Garden.objects.none()
        return selectors.visible_gardens(user=self.request.user)


class GardenAvailabilityView(APIView):
    """GET /gardens/{id}/availability/?date=YYYY-MM-DD — hourly slot map for a day."""

    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("date", str, required=True, description="YYYY-MM-DD")],
        responses=AvailabilitySerializer,
    )
    def get(self, request: Request, pk: int) -> Response:
        garden = get_object_or_404(selectors.visible_gardens(user=request.user), pk=pk)
        raw_date = request.query_params.get("date")
        try:
            day = datetime.strptime(raw_date, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return Response(
                {"date": ["Podaj datę w formacie YYYY-MM-DD."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = selectors.availability(garden=garden, day=day)
        return Response(AvailabilitySerializer(data).data)


# --- host -----------------------------------------------------------------------------


@extend_schema_view(
    post=extend_schema(request=GardenWriteSerializer, responses={201: GardenDetailSerializer}),
)
class HostGardenListCreateView(generics.ListCreateAPIView):
    """GET /host/gardens/ — the host's gardens (any status); POST — create one (pending)."""

    permission_classes = [IsHost]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Garden.objects.none()
        return selectors.host_gardens(host=self.request.user)

    def get_serializer_class(self):
        return GardenWriteSerializer if self.request.method == "POST" else GardenListSerializer

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = GardenWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        garden = services.create_garden(host=request.user, **serializer.validated_data)
        garden = selectors.host_gardens(host=request.user).get(pk=garden.pk)
        return Response(
            GardenDetailSerializer(garden, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    patch=extend_schema(request=GardenWriteSerializer, responses=GardenDetailSerializer),
    delete=extend_schema(responses={204: None}),
)
class HostGardenDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /host/gardens/{id}/ — manage one of the host's own gardens."""

    permission_classes = [IsHost, IsHostOfGarden]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Garden.objects.none()
        return selectors.host_gardens(host=self.request.user)

    def get_serializer_class(self):
        return GardenWriteSerializer if self.request.method == "PATCH" else GardenDetailSerializer

    def update(self, request: Request, *args, **kwargs) -> Response:
        garden = self.get_object()
        serializer = GardenWriteSerializer(instance=garden, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        garden = services.update_garden(garden=garden, data=serializer.validated_data)
        return Response(GardenDetailSerializer(garden, context=self.get_serializer_context()).data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        services.delete_garden(garden=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostGardenPhotoCreateView(APIView):
    """POST /host/gardens/{id}/photos/ — upload (compress + store) a gallery photo."""

    permission_classes = [IsHost]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=GardenPhotoUploadSerializer, responses={201: GardenPhotoSerializer})
    def post(self, request: Request, pk: int) -> Response:
        garden = get_object_or_404(selectors.host_gardens(host=request.user), pk=pk)
        serializer = GardenPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = services.add_garden_photo(garden=garden, image=serializer.validated_data["image"])
        return Response(
            GardenPhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class HostGardenPhotoDeleteView(APIView):
    """DELETE /host/gardens/{id}/photos/{photoId}/ — remove a gallery photo."""

    permission_classes = [IsHost]

    @extend_schema(responses={204: None})
    def delete(self, request: Request, pk: int, photo_id: int) -> Response:
        garden = get_object_or_404(selectors.host_gardens(host=request.user), pk=pk)
        photo = get_object_or_404(garden.photos, pk=photo_id)
        services.delete_garden_photo(photo=photo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostGardenPhotoReorderView(APIView):
    """PATCH /host/gardens/{id}/photos/reorder/ — set gallery order (cover first)."""

    permission_classes = [IsHost]

    @extend_schema(request=PhotoReorderSerializer, responses=GardenPhotoSerializer(many=True))
    def patch(self, request: Request, pk: int) -> Response:
        garden = get_object_or_404(selectors.host_gardens(host=request.user), pk=pk)
        serializer = PhotoReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photos = services.reorder_garden_photos(
            garden=garden, photo_ids=serializer.validated_data["photo_ids"]
        )
        return Response(GardenPhotoSerializer(photos, many=True, context={"request": request}).data)
