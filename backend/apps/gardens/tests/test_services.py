from datetime import date, datetime, time
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import serializers

from apps.gardens import selectors, services
from apps.gardens.models import Garden, GardenPhoto
from apps.gardens.tests.factories import GardenFactory, GardenPhotoFactory

pytestmark = pytest.mark.django_db


def _garden_data(**overrides):
    data = {
        "title": "Ogród z basenem",
        "description": "Duży, zacieniony teren.",
        "city": "Kraków",
        "address": "ul. Spacerowa 1",
        "latitude": Decimal("50.061400"),
        "longitude": Decimal("19.936600"),
        "area_m2": 800,
        "surface_type": "grass",
        "max_dogs": 3,
        "price_per_hour": Decimal("45.00"),
        "open_from": time(8, 0),
        "open_to": time(20, 0),
        "min_booking_hours": 1,
        "amenities": ["pool", "water"],
        "rules": ["Sprzątaj po pupilu."],
    }
    data.update(overrides)
    return data


# --- create / update ------------------------------------------------------------------


def test_create_garden_sets_host_and_pending_status(host_user):
    garden = services.create_garden(host=host_user, **_garden_data())

    garden.refresh_from_db()
    assert garden.host == host_user
    assert garden.verification_status == Garden.Verification.PENDING
    assert garden.is_active is True
    assert garden.amenities == ["pool", "water"]


def test_update_garden_changes_only_supplied_fields():
    garden = GardenFactory(title="Stary", price_per_hour=Decimal("40.00"))

    services.update_garden(garden=garden, data={"title": "Nowy"})
    garden.refresh_from_db()

    assert garden.title == "Nowy"
    assert garden.price_per_hour == Decimal("40.00")  # untouched


def test_update_price_keeps_approved_garden_live():
    garden = GardenFactory(verification_status=Garden.Verification.APPROVED)

    services.update_garden(garden=garden, data={"price_per_hour": Decimal("55.00")})
    garden.refresh_from_db()

    assert garden.verification_status == Garden.Verification.APPROVED


@pytest.mark.parametrize(
    "field,value",
    [
        ("city", "Wrocław"),
        ("address", "ul. Inna 9"),
        ("latitude", Decimal("52.000000")),
        ("longitude", Decimal("21.000000")),
    ],
)
def test_update_location_sends_approved_garden_back_to_pending(field, value):
    garden = GardenFactory(
        verification_status=Garden.Verification.APPROVED,
        rejection_reason="",
    )

    services.update_garden(garden=garden, data={field: value})
    garden.refresh_from_db()

    assert garden.verification_status == Garden.Verification.PENDING


def test_reverification_clears_rejection_reason():
    garden = GardenFactory(
        verification_status=Garden.Verification.APPROVED,
        rejection_reason="stary powód",
    )
    services.update_garden(garden=garden, data={"city": "Gdańsk"})
    garden.refresh_from_db()
    assert garden.rejection_reason == ""


def test_update_location_to_same_value_does_not_reverify():
    garden = GardenFactory(verification_status=Garden.Verification.APPROVED, city="Kraków")
    services.update_garden(garden=garden, data={"city": "Kraków"})
    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.APPROVED


def test_update_location_on_pending_garden_stays_pending():
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    services.update_garden(garden=garden, data={"city": "Łódź"})
    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.PENDING


# --- delete ---------------------------------------------------------------------------


def test_delete_garden_hard_deletes_when_unreferenced():
    garden = GardenFactory()
    assert services.delete_garden(garden=garden) is True
    assert not Garden.objects.filter(pk=garden.pk).exists()


def test_delete_garden_soft_deactivates_when_protected(monkeypatch):
    # Simulate the Reservation.garden PROTECT FK (B4) blocking a hard delete.
    from django.db.models import ProtectedError

    garden = GardenFactory(is_active=True)

    def _raise(*args, **kwargs):
        raise ProtectedError("protected", set())

    monkeypatch.setattr(garden, "delete", _raise)
    assert services.delete_garden(garden=garden) is False

    garden.refresh_from_db()
    assert garden.is_active is False  # offer pulled from catalogue, history preserved


# --- photos ---------------------------------------------------------------------------


def test_add_photo_stores_compressed_renditions_and_positions():
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    first = services.add_garden_photo(garden=garden, image=_image_file())
    second = services.add_garden_photo(garden=garden, image=_image_file())

    assert first.position == 0
    assert second.position == 1
    assert first.image and first.thumbnail
    assert first.image.name.endswith(".jpg")
    assert garden.photos.count() == 2


def test_add_photo_reverifies_approved_garden():
    garden = GardenFactory(verification_status=Garden.Verification.APPROVED)
    services.add_garden_photo(garden=garden, image=_image_file())
    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.PENDING


def test_add_photo_rejects_non_image():
    from django.core.files.uploadedfile import SimpleUploadedFile

    garden = GardenFactory()
    bad = SimpleUploadedFile("x.jpg", b"not an image", content_type="image/jpeg")
    with pytest.raises(serializers.ValidationError):
        services.add_garden_photo(garden=garden, image=bad)


def test_add_photo_enforces_limit_of_twelve():
    garden = GardenFactory()
    GardenPhotoFactory.create_batch(services.MAX_PHOTOS_PER_GARDEN, garden=garden)
    with pytest.raises(serializers.ValidationError):
        services.add_garden_photo(garden=garden, image=_image_file())


def test_delete_photo_reverifies_approved_garden():
    garden = GardenFactory(verification_status=Garden.Verification.APPROVED)
    photo = GardenPhotoFactory(garden=garden)
    services.delete_garden_photo(photo=photo)
    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.PENDING
    assert not GardenPhoto.objects.filter(pk=photo.pk).exists()


def test_reorder_photos_sets_positions_without_reverification():
    garden = GardenFactory(verification_status=Garden.Verification.APPROVED)
    p0 = GardenPhotoFactory(garden=garden, position=0)
    p1 = GardenPhotoFactory(garden=garden, position=1)
    p2 = GardenPhotoFactory(garden=garden, position=2)

    services.reorder_garden_photos(garden=garden, photo_ids=[p2.id, p0.id, p1.id])

    p0.refresh_from_db(), p1.refresh_from_db(), p2.refresh_from_db()
    assert (p2.position, p0.position, p1.position) == (0, 1, 2)
    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.APPROVED  # cosmetic only


def test_reorder_photos_rejects_foreign_or_incomplete_id_set():
    garden = GardenFactory()
    p0 = GardenPhotoFactory(garden=garden, position=0)
    GardenPhotoFactory(garden=garden, position=1)

    with pytest.raises(serializers.ValidationError):
        services.reorder_garden_photos(garden=garden, photo_ids=[p0.id])  # incomplete


# --- availability ---------------------------------------------------------------------


def test_availability_lists_open_hours_all_free_without_reservations():
    garden = GardenFactory(open_from=time(8, 0), open_to=time(20, 0))
    result = selectors.availability(garden=garden, day=date(2026, 7, 1))

    assert len(result["slots"]) == 12  # 08:00 .. 19:00
    assert result["slots"][0]["hour"] == "08:00"
    assert result["slots"][-1]["hour"] == "19:00"
    assert all(slot["available"] for slot in result["slots"])


def test_availability_respects_opening_window():
    garden = GardenFactory(open_from=time(10, 0), open_to=time(14, 0))
    result = selectors.availability(garden=garden, day=date(2026, 7, 1))
    hours = [slot["hour"] for slot in result["slots"]]
    assert hours == ["10:00", "11:00", "12:00", "13:00"]


def test_availability_marks_colliding_slots_unavailable(monkeypatch):
    garden = GardenFactory(open_from=time(8, 0), open_to=time(20, 0))
    tz = timezone.get_current_timezone()
    busy_start = timezone.make_aware(datetime(2026, 7, 1, 15, 0), tz)
    busy_end = timezone.make_aware(datetime(2026, 7, 1, 17, 0), tz)
    monkeypatch.setattr(selectors, "_busy_intervals", lambda **kwargs: [(busy_start, busy_end)])

    result = selectors.availability(garden=garden, day=date(2026, 7, 1))
    by_hour = {slot["hour"]: slot["available"] for slot in result["slots"]}

    assert by_hour["15:00"] is False
    assert by_hour["16:00"] is False
    assert by_hour["14:00"] is True
    assert by_hour["17:00"] is True


def _image_file(fmt="JPEG", name="photo.jpg", size=(900, 700)):
    import io

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", size, (90, 160, 110)).save(buffer, format=fmt)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type=f"image/{fmt.lower()}")
