"""Thin dog views (PLAN 8.2).

Reads come from ``selectors`` (owner-scoped → 404 for foreign ids), writes go through
``services``. The list/detail endpoints use DRF generics for correct paginated schema;
each write method is overridden to call exactly one service function.
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsClient
from apps.dogs import selectors, services
from apps.dogs.models import Dog
from apps.dogs.serializers import (
    DogDetailSerializer,
    DogListSerializer,
    DogPhotoSerializer,
    DogWriteSerializer,
)


@extend_schema_view(
    post=extend_schema(request=DogWriteSerializer, responses={201: DogDetailSerializer}),
)
class DogListCreateView(generics.ListCreateAPIView):
    """GET /dogs/ — the logged-in client's dogs; POST /dogs/ — add a dog."""

    permission_classes = [IsClient]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # schema generation has no real user
            return Dog.objects.none()
        return selectors.owned_dogs(owner=self.request.user)

    def get_serializer_class(self):
        return DogWriteSerializer if self.request.method == "POST" else DogListSerializer

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = DogWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dog = services.create_dog(owner=request.user, **serializer.validated_data)
        return Response(
            DogDetailSerializer(dog, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    patch=extend_schema(request=DogWriteSerializer, responses=DogDetailSerializer),
    delete=extend_schema(responses={204: None}),
)
class DogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /dogs/{id}/ — only the owner's own dog (others → 404)."""

    permission_classes = [IsClient]
    # Partial updates only; full-replacement PUT is not part of the contract (PLAN 8.2).
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # schema generation has no real user
            return Dog.objects.none()
        return selectors.owned_dogs(owner=self.request.user)

    def get_serializer_class(self):
        return DogWriteSerializer if self.request.method == "PATCH" else DogDetailSerializer

    def update(self, request: Request, *args, **kwargs) -> Response:
        dog = self.get_object()
        serializer = DogWriteSerializer(instance=dog, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        dog = services.update_dog(dog=dog, data=serializer.validated_data)
        return Response(DogDetailSerializer(dog, context=self.get_serializer_context()).data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        services.delete_dog(dog=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class DogPhotoView(APIView):
    """POST /dogs/{id}/photo/ — upload (compress + store) the dog's avatar."""

    permission_classes = [IsClient]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=DogPhotoSerializer, responses=DogDetailSerializer)
    def post(self, request: Request, pk: int) -> Response:
        dog = get_object_or_404(selectors.owned_dogs(owner=request.user), pk=pk)
        serializer = DogPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dog = services.set_dog_photo(dog=dog, image=serializer.validated_data["photo"])
        return Response(DogDetailSerializer(dog, context={"request": request}).data)
