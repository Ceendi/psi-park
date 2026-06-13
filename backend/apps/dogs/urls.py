"""Dog routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``."""

from django.urls import path

from apps.dogs.views import DogDetailView, DogListCreateView, DogPhotoView

urlpatterns = [
    path("dogs/", DogListCreateView.as_view(), name="dog-list"),
    path("dogs/<int:pk>/", DogDetailView.as_view(), name="dog-detail"),
    path("dogs/<int:pk>/photo/", DogPhotoView.as_view(), name="dog-photo"),
]
