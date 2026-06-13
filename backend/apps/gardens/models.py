from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.core.models import TimeStampedModel


class Amenity(models.TextChoices):
    """Garden amenities offered to guests (PLAN 7.3.1).

    Shared choices: other apps import this enum rather than redeclaring the codes.
    The list is extensible — adding a member needs no logic changes (OCP, PLAN 6.1).
    """

    POOL = "pool", "Basen dla psów"
    WATER = "water", "Woda i miski"
    SHELTER = "shelter", "Wiata / schronienie"
    LIGHTING = "lighting", "Oświetlenie wieczorne"
    PARKING = "parking", "Parking"
    AGILITY = "agility", "Tor agility"
    BENCH = "bench", "Ławki dla opiekuna"
    BIN = "bin", "Kosze na odchody"
    FENCED_SECURE = "fenced_secure", "Pełne ogrodzenie 1,8 m"
    SHADE = "shade", "Naturalny cień / drzewa"


class SurfaceType(models.TextChoices):
    GRASS = "grass", "Trawa"
    SAND = "sand", "Piasek"
    PAVED = "paved", "Utwardzona"
    MIXED = "mixed", "Mieszana"


class Garden(TimeStampedModel):
    """A host's fenced garden offer (PLAN 7.3).

    Public visibility ⇔ ``verification_status == APPROVED and is_active``. Rating
    aggregates are annotated by ``gardens.selectors`` (never computed per object).
    """

    class Verification(models.TextChoices):
        PENDING = "pending", "Oczekuje weryfikacji"
        APPROVED = "approved", "Zatwierdzony"
        REJECTED = "rejected", "Odrzucony"

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gardens",
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=80, db_index=True)
    address = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    area_m2 = models.PositiveIntegerField()
    surface_type = models.CharField(max_length=6, choices=SurfaceType.choices, blank=True)
    is_fenced = models.BooleanField(default=True)
    fence_height_m = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    max_dogs = models.PositiveSmallIntegerField(default=1)
    price_per_hour = models.DecimalField(max_digits=7, decimal_places=2)
    open_from = models.TimeField(default="08:00")
    open_to = models.TimeField(default="20:00")
    min_booking_hours = models.PositiveSmallIntegerField(default=1)
    amenities = models.JSONField(default=list, blank=True)
    rules = models.JSONField(default=list, blank=True)
    verification_status = models.CharField(
        max_length=10,
        choices=Verification.choices,
        default=Verification.PENDING,
        db_index=True,
    )
    rejection_reason = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Composite index backing the public catalogue query (PLAN 12).
            models.Index(
                fields=["city", "verification_status", "is_active"],
                name="garden_city_status_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                name="garden_open_to_after_open_from",
                condition=Q(open_to__gt=F("open_from")),
            ),
            models.CheckConstraint(
                name="garden_price_per_hour_positive",
                condition=Q(price_per_hour__gt=0),
            ),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def is_public(self) -> bool:
        return self.verification_status == self.Verification.APPROVED and self.is_active


class GardenPhoto(TimeStampedModel):
    """A gallery photo for a garden (PLAN 7.3). First by ``position`` is the card cover.

    Both renditions are produced by ``core.images`` at upload (full ≤1920 px, thumb 640 px).
    """

    garden = models.ForeignKey(
        Garden,
        on_delete=models.CASCADE,
        related_name="photos",
    )
    image = models.ImageField(upload_to="gardens/%Y/%m/")
    thumbnail = models.ImageField(upload_to="gardens/%Y/%m/")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return f"{self.garden_id}#{self.position}"
