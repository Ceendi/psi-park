"""Serializers for the gardens API (PLAN 6.1 ISP, 8.2, 8.3).

Separate shapes for list (light: cover + map coords + rating), detail (full + public host
+ amenity labels + gallery) and write. Rating aggregates are read via ``getattr`` so the
serializers tolerate both annotated querysets (selectors) and freshly built instances.
"""

from rest_framework import serializers

from apps.accounts.models import User
from apps.gardens.models import Amenity, Garden, GardenPhoto, SurfaceType


class HostPublicSerializer(serializers.ModelSerializer):
    """Public-facing host identity shown on a garden detail page."""

    full_name = serializers.CharField(read_only=True)
    is_verified_host = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "is_verified_host"]
        read_only_fields = fields


class GardenPhotoSerializer(serializers.ModelSerializer):
    """Read shape of a gallery photo (URLs are absolute when a request is in context)."""

    class Meta:
        model = GardenPhoto
        fields = ["id", "image", "thumbnail", "position"]
        read_only_fields = fields


class _RatingMixin(serializers.Serializer):
    """Expose annotated ``rating_avg`` / ``rating_count`` (PLAN 6.2); ``None`` until B7."""

    rating_avg = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()

    def get_rating_avg(self, obj: Garden) -> float | None:
        value = getattr(obj, "rating_avg", None)
        return round(float(value), 1) if value is not None else None

    def get_rating_count(self, obj: Garden) -> int:
        return getattr(obj, "rating_count", 0) or 0


class GardenListSerializer(_RatingMixin, serializers.ModelSerializer):
    """Light catalogue/map card: cover thumbnail, location, price, rating."""

    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Garden
        fields = [
            "id",
            "title",
            "city",
            "address",
            "latitude",
            "longitude",
            "area_m2",
            "surface_type",
            "max_dogs",
            "price_per_hour",
            "cover_image",
            "rating_avg",
            "rating_count",
        ]
        read_only_fields = fields

    def get_cover_image(self, obj: Garden) -> str | None:
        photos = list(obj.photos.all())  # prefetched, ordered by position
        if not photos:
            return None
        file = photos[0].thumbnail or photos[0].image
        if not file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class GardenDetailSerializer(_RatingMixin, serializers.ModelSerializer):
    """Full garden view: gallery, public host, amenity labels, rules, rating."""

    host = HostPublicSerializer(read_only=True)
    photos = GardenPhotoSerializer(many=True, read_only=True)
    amenities_display = serializers.SerializerMethodField()

    class Meta:
        model = Garden
        fields = [
            "id",
            "title",
            "description",
            "city",
            "address",
            "latitude",
            "longitude",
            "area_m2",
            "surface_type",
            "is_fenced",
            "fence_height_m",
            "max_dogs",
            "price_per_hour",
            "open_from",
            "open_to",
            "min_booking_hours",
            "amenities",
            "amenities_display",
            "rules",
            "verification_status",
            "rejection_reason",
            "is_active",
            "host",
            "photos",
            "rating_avg",
            "rating_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_amenities_display(self, obj: Garden) -> list[dict]:
        """Resolve stored amenity codes to ``{code, label}`` (label catalogue lives in BE)."""
        labels = dict(Amenity.choices)
        return [{"code": code, "label": labels[code]} for code in obj.amenities if code in labels]


class GardenWriteSerializer(serializers.ModelSerializer):
    """Validate garden create/update. ``host``/status/photos are set elsewhere (PLAN 8.2)."""

    amenities = serializers.ListField(
        child=serializers.ChoiceField(choices=Amenity.choices),
        required=False,
    )
    rules = serializers.ListField(
        child=serializers.CharField(max_length=200, allow_blank=False),
        required=False,
    )

    class Meta:
        model = Garden
        fields = [
            "title",
            "description",
            "city",
            "address",
            "latitude",
            "longitude",
            "area_m2",
            "surface_type",
            "is_fenced",
            "fence_height_m",
            "max_dogs",
            "price_per_hour",
            "open_from",
            "open_to",
            "min_booking_hours",
            "amenities",
            "rules",
            "is_active",
        ]
        extra_kwargs = {
            "title": {"allow_blank": False},
            "city": {"allow_blank": False},
            "address": {"allow_blank": False},
            "surface_type": {"choices": SurfaceType.choices},
        }

    def validate_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Szerokość geograficzna musi być w zakresie -90..90.")
        return value

    def validate_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Długość geograficzna musi być w zakresie -180..180.")
        return value

    def validate_area_m2(self, value):
        if value <= 0:
            raise serializers.ValidationError("Powierzchnia musi być liczbą dodatnią.")
        return value

    def validate_price_per_hour(self, value):
        if value <= 0:
            raise serializers.ValidationError("Cena za godzinę musi być liczbą dodatnią.")
        return value

    def validate_fence_height_m(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Wysokość ogrodzenia musi być liczbą dodatnią.")
        return value

    def validate_max_dogs(self, value):
        if value < 1:
            raise serializers.ValidationError("Ogród musi przyjmować co najmniej jednego psa.")
        return value

    def validate_min_booking_hours(self, value):
        if value < 1:
            raise serializers.ValidationError("Minimalny czas rezerwacji to co najmniej 1 godzina.")
        return value

    def validate(self, attrs: dict) -> dict:
        # Use the incoming value, or the instance's current value on a partial update.
        open_from = attrs.get("open_from") or getattr(self.instance, "open_from", None)
        open_to = attrs.get("open_to") or getattr(self.instance, "open_to", None)
        if open_from and open_to and open_to <= open_from:
            raise serializers.ValidationError(
                {"open_to": "Godzina zamknięcia musi być późniejsza niż otwarcia."}
            )
        return attrs


class GardenPhotoUploadSerializer(serializers.Serializer):
    """Multipart photo upload for a garden (PLAN 8.2). Heavy validation happens on processing."""

    image = serializers.ImageField(write_only=True)


class PhotoReorderSerializer(serializers.Serializer):
    """New gallery order: the full list of this garden's photo ids, cover first."""

    photo_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class SlotSerializer(serializers.Serializer):
    """One hourly availability slot (PLAN 8.3)."""

    hour = serializers.CharField()
    available = serializers.BooleanField()


class AvailabilitySerializer(serializers.Serializer):
    """Daily availability map for a garden (PLAN 8.3)."""

    date = serializers.DateField()
    open_from = serializers.TimeField(format="%H:%M")
    open_to = serializers.TimeField(format="%H:%M")
    slots = SlotSerializer(many=True)
