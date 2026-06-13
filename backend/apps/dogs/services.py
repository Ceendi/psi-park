"""Dog write operations and health logic (PLAN 5.1, 6.2, 15-B2).

Views validate input with serializers and then call exactly one of these functions.
All functions take keyword-only arguments. The health-status thresholds live here (not
in the model or a template, PLAN 7.2); the clock is injectable for deterministic tests.
"""

from datetime import date, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.core.exceptions import BusinessError
from apps.core.images import process_upload
from apps.dogs.models import Dog

# Health document is treated as "expiring soon" within this many days of its end date.
HEALTH_EXPIRING_DAYS = 30

HEALTH_VALID = "valid"
HEALTH_EXPIRING_SOON = "expiring_soon"
HEALTH_EXPIRED = "expired"
HEALTH_UNKNOWN = "unknown"

# Worst-first severity used to fold the per-document statuses into one overall status.
_HEALTH_SEVERITY = {
    HEALTH_EXPIRED: 3,
    HEALTH_EXPIRING_SOON: 2,
    HEALTH_UNKNOWN: 1,
    HEALTH_VALID: 0,
}


class DogHasReservations(BusinessError):
    """Raised when a dog cannot be deleted because reservations still reference it.

    Enforced through the ``Reservation.dog`` PROTECT foreign key (PLAN 7.4): until that
    model exists (B4) no dog has reservations, so this never fires.
    """

    status_code = 409
    default_detail = "Nie można usunąć psa powiązanego z rezerwacjami."
    default_code = "dog_has_reservations"


def date_health_status(*, valid_until: date | None, today: date | None = None) -> str:
    """Classify a single health document's end date as valid/expiring_soon/expired/unknown."""
    if valid_until is None:
        return HEALTH_UNKNOWN
    today = today or timezone.localdate()
    if valid_until < today:
        return HEALTH_EXPIRED
    if valid_until <= today + timedelta(days=HEALTH_EXPIRING_DAYS):
        return HEALTH_EXPIRING_SOON
    return HEALTH_VALID


def health_status(*, dog: Dog, today: date | None = None) -> str:
    """Overall health status: the worst of the vaccination and deworming statuses (PLAN 7.2)."""
    today = today or timezone.localdate()
    statuses = (
        date_health_status(valid_until=dog.vaccinations_valid_until, today=today),
        date_health_status(valid_until=dog.deworming_valid_until, today=today),
    )
    return max(statuses, key=_HEALTH_SEVERITY.__getitem__)


def create_dog(
    *,
    owner: User,
    name: str,
    breed: str = "",
    birth_date: date | None = None,
    weight_kg=None,
    sex: str = "",
    is_sterilized: bool = False,
    vaccinations_valid_until: date | None = None,
    deworming_valid_until: date | None = None,
    notes: str = "",
) -> Dog:
    """Create a dog profile owned by ``owner`` (the serializer validated the input shape)."""
    return Dog.objects.create(
        owner=owner,
        name=name,
        breed=breed,
        birth_date=birth_date,
        weight_kg=weight_kg,
        sex=sex,
        is_sterilized=is_sterilized,
        vaccinations_valid_until=vaccinations_valid_until,
        deworming_valid_until=deworming_valid_until,
        notes=notes,
    )


def update_dog(*, dog: Dog, data: dict) -> Dog:
    """Apply the validated PATCH fields in ``data`` (only the keys the client sent)."""
    for field, value in data.items():
        setattr(dog, field, value)
    if data:
        dog.save(update_fields=[*data.keys(), "updated_at"])
    return dog


def delete_dog(*, dog: Dog) -> None:
    """Delete a dog.

    Raises:
        DogHasReservations: when reservations still reference the dog (PROTECT, PLAN 7.4).
    """
    try:
        dog.delete()
    except ProtectedError as exc:
        raise DogHasReservations() from exc


def set_dog_photo(*, dog: Dog, image) -> Dog:
    """Compress and store the dog's avatar (PLAN AD-7).

    Raises:
        serializers.ValidationError: when the file is not a valid, supported, in-size image.
    """
    try:
        full_image, _thumbnail = process_upload(image)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"photo": list(exc.messages)}) from exc
    dog.photo.save(f"dog_{dog.pk}.jpg", full_image, save=True)
    return dog
