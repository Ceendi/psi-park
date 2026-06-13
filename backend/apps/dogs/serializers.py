"""Serializers for the dogs API.

Separate serializers for read (list/detail) and write (ISP — PLAN 6.1). Computed
health/age fields are read-only and delegate their threshold logic to ``dogs.services``
(PLAN 7.2); the photo is uploaded through a dedicated endpoint, not these serializers.
"""

from django.utils import timezone
from rest_framework import serializers

from apps.dogs import services
from apps.dogs.models import Dog


class DogDetailSerializer(serializers.ModelSerializer):
    """Full read shape of a dog. ``DogListSerializer`` narrows the field set."""

    age_label = serializers.SerializerMethodField()
    health_status = serializers.SerializerMethodField()
    vaccinations_status = serializers.SerializerMethodField()
    deworming_status = serializers.SerializerMethodField()

    class Meta:
        model = Dog
        fields = [
            "id",
            "name",
            "breed",
            "birth_date",
            "age_label",
            "weight_kg",
            "sex",
            "is_sterilized",
            "vaccinations_valid_until",
            "vaccinations_status",
            "deworming_valid_until",
            "deworming_status",
            "health_status",
            "notes",
            "photo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_age_label(self, obj: Dog) -> str | None:
        return obj.age_label

    def get_health_status(self, obj: Dog) -> str:
        return services.health_status(dog=obj)

    def get_vaccinations_status(self, obj: Dog) -> str:
        return services.date_health_status(valid_until=obj.vaccinations_valid_until)

    def get_deworming_status(self, obj: Dog) -> str:
        return services.date_health_status(valid_until=obj.deworming_valid_until)


class DogListSerializer(DogDetailSerializer):
    """Lighter shape for the "Moi pupile" list (drops free-text and audit fields)."""

    class Meta(DogDetailSerializer.Meta):
        fields = [
            "id",
            "name",
            "breed",
            "age_label",
            "weight_kg",
            "sex",
            "is_sterilized",
            "vaccinations_status",
            "deworming_status",
            "health_status",
            "photo",
        ]
        read_only_fields = fields


class DogWriteSerializer(serializers.ModelSerializer):
    """Validate dog input on create/update. ``owner`` and ``photo`` are set elsewhere."""

    class Meta:
        model = Dog
        fields = [
            "name",
            "breed",
            "birth_date",
            "weight_kg",
            "sex",
            "is_sterilized",
            "vaccinations_valid_until",
            "deworming_valid_until",
            "notes",
        ]
        extra_kwargs = {"name": {"allow_blank": False}}

    def validate_birth_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Data urodzenia nie może być w przyszłości.")
        return value

    def validate_weight_kg(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Waga musi być liczbą dodatnią.")
        return value


class DogPhotoSerializer(serializers.Serializer):
    """Multipart photo upload for a dog (PLAN 8.2). Heavy validation happens on processing."""

    photo = serializers.ImageField(write_only=True)
