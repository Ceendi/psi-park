"""Garden write operations and gallery management (PLAN 5.1, 6.2, 15-B3).

Views validate the input shape with a serializer and then call exactly one of these
functions (keyword-only args, PLAN 6.2). Re-verification rule (PLAN 8.2): editing the
price/hours leaves an approved listing live, but changing its location or photo set
sends it back to ``pending``.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max, ProtectedError
from rest_framework import serializers

from apps.accounts.models import User
from apps.core.images import process_upload
from apps.gardens.models import Garden, GardenPhoto

# A garden may carry at most this many gallery photos (PLAN 7.3).
MAX_PHOTOS_PER_GARDEN = 12

# Editing any of these on an approved garden forces re-verification (PLAN 8.2).
_LOCATION_FIELDS = ("city", "address", "latitude", "longitude")


def _revert_to_pending_if_approved(*, garden: Garden) -> None:
    """Send an approved garden back to the verification queue after a significant change."""
    if garden.verification_status == Garden.Verification.APPROVED:
        garden.verification_status = Garden.Verification.PENDING
        garden.rejection_reason = ""
        garden.save(update_fields=["verification_status", "rejection_reason", "updated_at"])


def create_garden(*, host: User, **data) -> Garden:
    """Create a host's garden in ``pending`` status (the serializer validated ``data``)."""
    return Garden.objects.create(host=host, **data)


def update_garden(*, garden: Garden, data: dict) -> Garden:
    """Apply the validated PATCH fields; re-verify when a location field actually changed."""
    location_changed = any(
        field in data and getattr(garden, field) != data[field] for field in _LOCATION_FIELDS
    )
    for field, value in data.items():
        setattr(garden, field, value)

    update_fields = set(data.keys())
    if location_changed and garden.verification_status == Garden.Verification.APPROVED:
        garden.verification_status = Garden.Verification.PENDING
        garden.rejection_reason = ""
        update_fields |= {"verification_status", "rejection_reason"}

    if update_fields:
        update_fields.add("updated_at")
        garden.save(update_fields=update_fields)
    return garden


def delete_garden(*, garden: Garden) -> bool:
    """Remove a host's offer.

    Hard-deletes when nothing references the garden; if a ``PROTECT`` foreign key blocks
    it (reservations exist, B4) the offer is soft-deactivated instead so accounting
    history survives (PLAN 8.2). Returns ``True`` when hard-deleted, ``False`` when
    deactivated.
    """
    try:
        garden.delete()
        return True
    except ProtectedError:
        if garden.is_active:
            garden.is_active = False
            garden.save(update_fields=["is_active", "updated_at"])
        return False


def add_garden_photo(*, garden: Garden, image) -> GardenPhoto:
    """Compress and append a gallery photo; re-verify the garden if it was approved.

    Raises:
        serializers.ValidationError: when the gallery is full or the file is not a
            valid, supported, in-size image.
    """
    if garden.photos.count() >= MAX_PHOTOS_PER_GARDEN:
        raise serializers.ValidationError(
            {"image": f"Ogród może mieć maksymalnie {MAX_PHOTOS_PER_GARDEN} zdjęć."}
        )
    try:
        full_image, thumbnail = process_upload(image)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"image": list(exc.messages)}) from exc

    last_position = garden.photos.aggregate(value=Max("position"))["value"]
    position = 0 if last_position is None else last_position + 1
    photo = GardenPhoto(garden=garden, position=position)
    photo.image.save(f"garden_{garden.pk}_{position}.jpg", full_image, save=False)
    photo.thumbnail.save(f"garden_{garden.pk}_{position}_thumb.jpg", thumbnail, save=False)
    photo.save()
    _revert_to_pending_if_approved(garden=garden)
    return photo


def delete_garden_photo(*, photo: GardenPhoto) -> None:
    """Delete a gallery photo and re-verify its garden if it was approved."""
    garden = photo.garden
    photo.delete()
    _revert_to_pending_if_approved(garden=garden)


@transaction.atomic
def reorder_garden_photos(*, garden: Garden, photo_ids: list[int]) -> list[GardenPhoto]:
    """Set gallery order from ``photo_ids`` (index 0 becomes the cover).

    Pure re-ordering does not trigger re-verification. ``photo_ids`` must be exactly the
    garden's current photo ids.

    Raises:
        serializers.ValidationError: when the ids are not exactly this garden's photos.
    """
    photos_by_id = {photo.id: photo for photo in garden.photos.all()}
    if len(photo_ids) != len(photos_by_id) or set(photo_ids) != set(photos_by_id):
        raise serializers.ValidationError(
            {"photo_ids": "Lista musi zawierać dokładnie identyfikatory zdjęć tego ogrodu."}
        )
    for position, photo_id in enumerate(photo_ids):
        photo = photos_by_id[photo_id]
        if photo.position != position:
            photo.position = position
            photo.save(update_fields=["position", "updated_at"])
    return [photos_by_id[photo_id] for photo_id in photo_ids]
