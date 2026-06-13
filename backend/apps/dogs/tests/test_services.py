import io
from datetime import date
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import ProtectedError
from freezegun import freeze_time
from PIL import Image
from rest_framework import serializers

from apps.dogs import services
from apps.dogs.models import Dog
from apps.dogs.tests.factories import DogFactory

pytestmark = pytest.mark.django_db

TODAY = date(2026, 6, 13)


def _image_file(fmt="PNG", size=(1000, 800), name="photo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", size, (120, 180, 140)).save(buffer, format=fmt)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type=f"image/{fmt.lower()}")


# --- create / update / delete ---------------------------------------------------------


def test_create_dog_sets_owner_and_fields(client_user):
    dog = services.create_dog(
        owner=client_user,
        name="Reksio",
        breed="Owczarek",
        weight_kg=Decimal("20.5"),
        sex=Dog.Sex.MALE,
        is_sterilized=True,
    )

    dog.refresh_from_db()
    assert dog.owner == client_user
    assert dog.name == "Reksio"
    assert dog.breed == "Owczarek"
    assert dog.weight_kg == Decimal("20.5")
    assert dog.is_sterilized is True


def test_update_dog_changes_only_supplied_fields():
    dog = DogFactory(name="Łata", breed="Border Collie")

    services.update_dog(dog=dog, data={"name": "Łatka"})
    dog.refresh_from_db()

    assert dog.name == "Łatka"
    assert dog.breed == "Border Collie"  # untouched


def test_update_dog_can_clear_a_date():
    dog = DogFactory(vaccinations_valid_until=date(2027, 1, 1))

    services.update_dog(dog=dog, data={"vaccinations_valid_until": None})
    dog.refresh_from_db()

    assert dog.vaccinations_valid_until is None


def test_update_dog_noop_without_data():
    dog = DogFactory(name="Borys")
    services.update_dog(dog=dog, data={})
    dog.refresh_from_db()
    assert dog.name == "Borys"


def test_delete_dog_removes_row():
    dog = DogFactory()
    services.delete_dog(dog=dog)
    assert not Dog.objects.filter(pk=dog.pk).exists()


# --- single-document health status ----------------------------------------------------


def test_date_health_status_unknown_when_missing():
    assert services.date_health_status(valid_until=None, today=TODAY) == "unknown"


def test_date_health_status_valid_when_far_future():
    assert services.date_health_status(valid_until=date(2026, 8, 1), today=TODAY) == "valid"


def test_date_health_status_expiring_soon_within_30_days():
    assert services.date_health_status(valid_until=date(2026, 7, 1), today=TODAY) == "expiring_soon"


def test_date_health_status_expired_in_the_past():
    assert services.date_health_status(valid_until=date(2026, 6, 1), today=TODAY) == "expired"


@pytest.mark.parametrize(
    ("valid_until", "expected"),
    [
        (date(2026, 6, 13), "expiring_soon"),  # expires exactly today → still counts, warn
        (date(2026, 7, 13), "expiring_soon"),  # exactly +30 days → inclusive
        (date(2026, 7, 14), "valid"),  # +31 days → valid
        (date(2026, 6, 12), "expired"),  # yesterday → expired
    ],
)
def test_date_health_status_boundaries(valid_until, expected):
    assert services.date_health_status(valid_until=valid_until, today=TODAY) == expected


# --- overall health status (worst of both documents) ----------------------------------


@pytest.mark.parametrize(
    ("vacc", "deworm", "expected"),
    [
        (date(2026, 8, 1), date(2026, 9, 1), "valid"),
        (date(2026, 6, 1), date(2026, 8, 1), "expired"),  # one expired wins
        (date(2026, 7, 1), date(2026, 8, 1), "expiring_soon"),  # one expiring wins over valid
        (None, date(2026, 8, 1), "unknown"),  # one unknown wins over valid
        (None, None, "unknown"),
        (date(2026, 6, 1), None, "expired"),  # expired wins over unknown
    ],
)
def test_health_status_folds_to_worst(vacc, deworm, expected):
    dog = Dog(vaccinations_valid_until=vacc, deworming_valid_until=deworm)
    assert services.health_status(dog=dog, today=TODAY) == expected


# --- age_label (model property) -------------------------------------------------------


@freeze_time("2026-06-13")
@pytest.mark.parametrize(
    ("birth_date", "expected"),
    [
        (None, None),
        (date(2025, 6, 13), "1 rok"),
        (date(2023, 6, 13), "3 lata"),
        (date(2021, 6, 13), "5 lat"),
        (date(2014, 6, 13), "12 lat"),  # 12-14 take the "many" form
        (date(2026, 5, 13), "1 miesiąc"),
        (date(2026, 4, 13), "2 miesiące"),
        (date(2026, 1, 13), "5 miesięcy"),
        (date(2026, 5, 20), "poniżej miesiąca"),  # not yet a full month (day-of-month carry)
        (date(2026, 6, 1), "poniżej miesiąca"),
        (date(2027, 1, 1), None),  # future → unknown
    ],
)
def test_age_label(birth_date, expected):
    assert Dog(birth_date=birth_date).age_label == expected


def test_str_is_dog_name():
    assert str(Dog(name="Łata")) == "Łata"


def test_delete_dog_blocked_when_reservations_protect_it(monkeypatch):
    # Simulate the Reservation.dog PROTECT FK (B4) firing on delete.
    dog = DogFactory()

    def _raise(*args, **kwargs):
        raise ProtectedError("protected", set())

    monkeypatch.setattr(dog, "delete", _raise)
    with pytest.raises(services.DogHasReservations):
        services.delete_dog(dog=dog)


# --- photo upload ---------------------------------------------------------------------


def test_set_dog_photo_stores_compressed_image():
    dog = DogFactory()
    services.set_dog_photo(dog=dog, image=_image_file())

    dog.refresh_from_db()
    assert dog.photo
    assert dog.photo.name.endswith(".jpg")


def test_set_dog_photo_rejects_non_image():
    dog = DogFactory()
    bad = SimpleUploadedFile("x.png", b"not really an image", content_type="image/png")
    with pytest.raises(serializers.ValidationError):
        services.set_dog_photo(dog=dog, image=bad)


def test_set_dog_photo_rejects_oversized(monkeypatch):
    dog = DogFactory()
    file = _image_file()
    monkeypatch.setattr(file, "size", 6 * 1024 * 1024)
    with pytest.raises(serializers.ValidationError):
        services.set_dog_photo(dog=dog, image=file)
