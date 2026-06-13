import io
from datetime import date

import pytest
from django.urls import reverse
from freezegun import freeze_time
from PIL import Image

from apps.dogs.models import Dog
from apps.dogs.tests.factories import DogFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("dog-list")


def _detail_url(pk):
    return reverse("dog-detail", args=[pk])


def _photo_url(pk):
    return reverse("dog-photo", args=[pk])


def _upload_file(fmt="PNG", name="photo.png"):
    from django.core.files.uploadedfile import SimpleUploadedFile

    buffer = io.BytesIO()
    Image.new("RGB", (800, 600), (120, 180, 140)).save(buffer, format=fmt)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type=f"image/{fmt.lower()}")


def _payload(**overrides):
    payload = {"name": "Reksio", "breed": "Owczarek", "sex": "male", "is_sterilized": True}
    payload.update(overrides)
    return payload


# --- list -----------------------------------------------------------------------------


def test_list_requires_authentication(api_client):
    assert api_client.get(LIST_URL).status_code == 401


def test_list_forbidden_for_host(api_client, host_user):
    api_client.force_authenticate(user=host_user)
    assert api_client.get(LIST_URL).status_code == 403


def test_list_returns_only_own_dogs(auth_client, other_client):
    client, user = auth_client
    DogFactory(owner=user, name="Łata")
    DogFactory(owner=user, name="Borys")
    DogFactory(owner=other_client, name="Obcy")  # belongs to someone else

    response = client.get(LIST_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    names = {dog["name"] for dog in body["results"]}
    assert names == {"Łata", "Borys"}


# --- create ---------------------------------------------------------------------------


def test_create_dog_returns_detail(auth_client):
    client, user = auth_client
    response = client.post(LIST_URL, _payload(), format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["name"] == "Reksio"
    assert body["health_status"] == "unknown"  # no health dates yet
    assert "age_label" in body
    assert Dog.objects.get(pk=body["id"]).owner == user


def test_create_dog_with_full_data(auth_client):
    client, _ = auth_client
    response = client.post(
        LIST_URL,
        _payload(birth_date="2022-05-10", weight_kg="18.5", vaccinations_valid_until="2027-01-01"),
        format="json",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["birth_date"] == "2022-05-10"
    assert body["weight_kg"] == "18.5"
    assert body["age_label"]  # derived from birth_date


def test_create_requires_authentication(api_client):
    assert api_client.post(LIST_URL, _payload(), format="json").status_code == 401


def test_create_forbidden_for_host(api_client, host_user):
    api_client.force_authenticate(user=host_user)
    assert api_client.post(LIST_URL, _payload(), format="json").status_code == 403


def test_create_rejects_blank_name(auth_client):
    client, _ = auth_client
    response = client.post(LIST_URL, _payload(name=""), format="json")
    assert response.status_code == 400
    assert "name" in response.json()


def test_create_rejects_future_birth_date(auth_client):
    client, _ = auth_client
    response = client.post(LIST_URL, _payload(birth_date="2999-01-01"), format="json")
    assert response.status_code == 400
    assert "birth_date" in response.json()


def test_create_rejects_non_positive_weight(auth_client):
    client, _ = auth_client
    response = client.post(LIST_URL, _payload(weight_kg="0"), format="json")
    assert response.status_code == 400
    assert "weight_kg" in response.json()


# --- retrieve -------------------------------------------------------------------------


def test_retrieve_own_dog(auth_client):
    client, user = auth_client
    dog = DogFactory(owner=user, name="Łata")
    response = client.get(_detail_url(dog.pk))
    assert response.status_code == 200
    assert response.json()["name"] == "Łata"


def test_retrieve_other_users_dog_returns_404(auth_client, other_client):
    client, _ = auth_client
    foreign = DogFactory(owner=other_client)
    assert client.get(_detail_url(foreign.pk)).status_code == 404


# --- update ---------------------------------------------------------------------------


def test_patch_updates_dog(auth_client):
    client, user = auth_client
    dog = DogFactory(owner=user, name="Łata", breed="Border Collie")
    response = client.patch(_detail_url(dog.pk), {"name": "Łatka"}, format="json")

    assert response.status_code == 200
    assert response.json()["name"] == "Łatka"
    dog.refresh_from_db()
    assert dog.name == "Łatka"
    assert dog.breed == "Border Collie"


def test_patch_other_users_dog_returns_404(auth_client, other_client):
    client, _ = auth_client
    foreign = DogFactory(owner=other_client)
    response = client.patch(_detail_url(foreign.pk), {"name": "Hack"}, format="json")
    assert response.status_code == 404


# --- delete ---------------------------------------------------------------------------


def test_delete_own_dog(auth_client):
    client, user = auth_client
    dog = DogFactory(owner=user)
    assert client.delete(_detail_url(dog.pk)).status_code == 204
    assert not Dog.objects.filter(pk=dog.pk).exists()


def test_delete_other_users_dog_returns_404(auth_client, other_client):
    client, _ = auth_client
    foreign = DogFactory(owner=other_client)
    assert client.delete(_detail_url(foreign.pk)).status_code == 404
    assert Dog.objects.filter(pk=foreign.pk).exists()


# --- photo upload ---------------------------------------------------------------------


def test_upload_photo_sets_photo(auth_client):
    client, user = auth_client
    dog = DogFactory(owner=user)
    response = client.post(_photo_url(dog.pk), {"photo": _upload_file()}, format="multipart")

    assert response.status_code == 200
    assert response.json()["photo"]
    dog.refresh_from_db()
    assert dog.photo


def test_upload_rejects_non_image(auth_client):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client, user = auth_client
    dog = DogFactory(owner=user)
    bad = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
    response = client.post(_photo_url(dog.pk), {"photo": bad}, format="multipart")
    assert response.status_code == 400


def test_upload_other_users_dog_returns_404(auth_client, other_client):
    client, _ = auth_client
    foreign = DogFactory(owner=other_client)
    response = client.post(_photo_url(foreign.pk), {"photo": _upload_file()}, format="multipart")
    assert response.status_code == 404


# --- health status surfaced through the API -------------------------------------------


@freeze_time("2026-06-13")
def test_health_status_reflects_dates(auth_client):
    client, user = auth_client
    dog = DogFactory(
        owner=user,
        vaccinations_valid_until=date(2026, 6, 1),  # expired
        deworming_valid_until=date(2027, 1, 1),  # valid
    )
    body = client.get(_detail_url(dog.pk)).json()
    assert body["vaccinations_status"] == "expired"
    assert body["deworming_status"] == "valid"
    assert body["health_status"] == "expired"  # worst wins
