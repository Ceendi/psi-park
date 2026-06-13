import io
from decimal import Decimal

import pytest
from django.urls import reverse
from PIL import Image

from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory, GardenPhotoFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("garden-list")
HOST_LIST_URL = reverse("host-garden-list")


def _detail_url(pk):
    return reverse("garden-detail", args=[pk])


def _availability_url(pk):
    return reverse("garden-availability", args=[pk])


def _host_detail_url(pk):
    return reverse("host-garden-detail", args=[pk])


def _photos_url(pk):
    return reverse("host-garden-photos", args=[pk])


def _photo_detail_url(pk, photo_id):
    return reverse("host-garden-photo-detail", args=[pk, photo_id])


def _reorder_url(pk):
    return reverse("host-garden-photo-reorder", args=[pk])


def _image_file(fmt="JPEG", name="photo.jpg"):
    buffer = io.BytesIO()
    Image.new("RGB", (900, 700), (90, 160, 110)).save(buffer, format=fmt)
    buffer.seek(0)
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(name, buffer.read(), content_type=f"image/{fmt.lower()}")


def _create_payload(**overrides):
    payload = {
        "title": "Ogród z basenem i wiatą",
        "description": "Duży, zacieniony teren dla psów.",
        "city": "Kraków",
        "address": "ul. Spacerowa 1",
        "latitude": "50.061400",
        "longitude": "19.936600",
        "area_m2": 800,
        "surface_type": "grass",
        "max_dogs": 3,
        "price_per_hour": "45.00",
        "open_from": "08:00:00",
        "open_to": "20:00:00",
        "min_booking_hours": 1,
        "amenities": ["pool", "water"],
        "rules": ["Sprzątaj po pupilu."],
    }
    payload.update(overrides)
    return payload


def _titles(response):
    return {row["title"] for row in response.json()["results"]}


# --- public list: visibility ----------------------------------------------------------


def test_list_is_public_and_shows_only_approved_active(api_client):
    GardenFactory(title="Widoczny")
    GardenFactory(title="Oczekujący", verification_status=Garden.Verification.PENDING)
    GardenFactory(title="Odrzucony", verification_status=Garden.Verification.REJECTED)
    GardenFactory(title="Wyłączony", is_active=False)

    response = api_client.get(LIST_URL)

    assert response.status_code == 200
    assert _titles(response) == {"Widoczny"}


def test_list_card_shape(api_client):
    garden = GardenFactory(title="Karta", city="Kraków", price_per_hour=Decimal("45.00"))
    GardenPhotoFactory(garden=garden, position=0)

    row = api_client.get(LIST_URL).json()["results"][0]

    assert row["title"] == "Karta"
    assert row["city"] == "Kraków"
    assert row["price_per_hour"] == "45.00"
    assert row["latitude"] and row["longitude"]  # map markers
    assert row["cover_image"]  # first photo thumbnail
    assert row["rating_avg"] is None  # no reviews app yet (B7)
    assert row["rating_count"] == 0


# --- public list: filters -------------------------------------------------------------


def test_filter_city_icontains(api_client):
    GardenFactory(title="KR", city="Kraków")
    GardenFactory(title="WR", city="Wrocław")
    assert _titles(api_client.get(LIST_URL, {"city": "krak"})) == {"KR"}


def test_filter_price_range(api_client):
    GardenFactory(title="Tania", price_per_hour=Decimal("30.00"))
    GardenFactory(title="Średnia", price_per_hour=Decimal("45.00"))
    GardenFactory(title="Droga", price_per_hour=Decimal("60.00"))
    assert _titles(api_client.get(LIST_URL, {"min_price": 40, "max_price": 50})) == {"Średnia"}


def test_filter_min_area(api_client):
    GardenFactory(title="Mały", area_m2=300)
    GardenFactory(title="Duży", area_m2=800)
    assert _titles(api_client.get(LIST_URL, {"min_area": 500})) == {"Duży"}


def test_filter_max_dogs_means_allows_at_least(api_client):
    GardenFactory(title="Jeden", max_dogs=1)
    GardenFactory(title="Trzy", max_dogs=3)
    assert _titles(api_client.get(LIST_URL, {"max_dogs": 2})) == {"Trzy"}


def test_filter_surface_type(api_client):
    GardenFactory(title="Trawa", surface_type="grass")
    GardenFactory(title="Piasek", surface_type="sand")
    assert _titles(api_client.get(LIST_URL, {"surface_type": "sand"})) == {"Piasek"}


def test_filter_amenities_requires_all(api_client):
    GardenFactory(title="Pełny", amenities=["pool", "water"])
    GardenFactory(title="Częściowy", amenities=["water"])
    assert _titles(api_client.get(LIST_URL, {"amenities": "pool"})) == {"Pełny"}
    assert _titles(api_client.get(LIST_URL, {"amenities": "pool,water"})) == {"Pełny"}


def test_filter_opening_window(api_client):
    from datetime import time

    GardenFactory(title="Całodobowy", open_from=time(8, 0), open_to=time(20, 0))
    GardenFactory(title="Krótki", open_from=time(10, 0), open_to=time(14, 0))
    response = api_client.get(LIST_URL, {"time_from": "09:00", "time_to": "18:00"})
    assert _titles(response) == {"Całodobowy"}


def test_filter_date_is_accepted(api_client):
    GardenFactory(title="A")
    response = api_client.get(LIST_URL, {"date": "2026-07-01"})
    assert response.status_code == 200
    assert _titles(response) == {"A"}


def test_filter_in_bbox(api_client):
    GardenFactory(title="Kraków", latitude=Decimal("50.0614"), longitude=Decimal("19.9366"))
    GardenFactory(title="Warszawa", latitude=Decimal("52.2297"), longitude=Decimal("21.0122"))
    response = api_client.get(LIST_URL, {"in_bbox": "19.0,49.0,21.0,51.0"})
    assert _titles(response) == {"Kraków"}


def test_filter_in_bbox_ignores_malformed(api_client):
    GardenFactory(title="A")
    response = api_client.get(LIST_URL, {"in_bbox": "not-a-bbox"})
    assert response.status_code == 200
    assert _titles(response) == {"A"}


def test_sort_by_price_ascending(api_client):
    GardenFactory(title="C", price_per_hour=Decimal("60.00"))
    GardenFactory(title="A", price_per_hour=Decimal("30.00"))
    GardenFactory(title="B", price_per_hour=Decimal("45.00"))
    response = api_client.get(LIST_URL, {"ordering": "price_per_hour"})
    titles = [row["title"] for row in response.json()["results"]]
    assert titles == ["A", "B", "C"]


def test_sort_by_rating_does_not_error_without_reviews(api_client):
    GardenFactory.create_batch(2)
    assert api_client.get(LIST_URL, {"ordering": "-rating_avg"}).status_code == 200


# --- public detail --------------------------------------------------------------------


def test_detail_full_shape(api_client):
    garden = GardenFactory(amenities=["pool", "water"], rules=["Zasada A"])
    GardenPhotoFactory(garden=garden, position=0)

    body = api_client.get(_detail_url(garden.pk)).json()

    assert body["id"] == garden.pk
    assert body["host"]["full_name"]
    assert "is_verified_host" in body["host"]
    assert len(body["photos"]) == 1
    assert {"code": "pool", "label": "Basen dla psów"} in body["amenities_display"]
    assert body["amenities"] == ["pool", "water"]
    assert body["rules"] == ["Zasada A"]
    assert body["rating_avg"] is None


def test_detail_pending_hidden_from_anonymous(api_client):
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    assert api_client.get(_detail_url(garden.pk)).status_code == 404


def test_detail_pending_hidden_from_other_client(api_client, client_user):
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    api_client.force_authenticate(user=client_user)
    assert api_client.get(_detail_url(garden.pk)).status_code == 404


def test_detail_pending_visible_to_owner(api_client):
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    api_client.force_authenticate(user=garden.host)
    assert api_client.get(_detail_url(garden.pk)).status_code == 200


def test_detail_pending_visible_to_admin(api_client, admin_user):
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    api_client.force_authenticate(user=admin_user)
    assert api_client.get(_detail_url(garden.pk)).status_code == 200


# --- availability ---------------------------------------------------------------------


def test_availability_returns_slots(api_client):
    garden = GardenFactory()
    body = api_client.get(_availability_url(garden.pk), {"date": "2026-07-01"}).json()
    assert body["date"] == "2026-07-01"
    assert body["open_from"] == "08:00"
    assert len(body["slots"]) == 12
    assert body["slots"][0] == {"hour": "08:00", "available": True}


def test_availability_requires_valid_date(api_client):
    garden = GardenFactory()
    assert api_client.get(_availability_url(garden.pk)).status_code == 400
    assert api_client.get(_availability_url(garden.pk), {"date": "bad"}).status_code == 400


# --- query budgets (PLAN 12) ----------------------------------------------------------


def test_list_query_budget(api_client, django_assert_max_num_queries):
    for _ in range(3):
        garden = GardenFactory()
        GardenPhotoFactory.create_batch(2, garden=garden)
    with django_assert_max_num_queries(6):
        assert api_client.get(LIST_URL).status_code == 200


def test_detail_query_budget(api_client, django_assert_max_num_queries):
    garden = GardenFactory()
    GardenPhotoFactory.create_batch(3, garden=garden)
    with django_assert_max_num_queries(8):
        assert api_client.get(_detail_url(garden.pk)).status_code == 200


# --- host list / create ---------------------------------------------------------------


def test_host_list_requires_auth(api_client):
    assert api_client.get(HOST_LIST_URL).status_code == 401


def test_host_list_forbidden_for_client(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    assert api_client.get(HOST_LIST_URL).status_code == 403


def test_host_list_returns_own_gardens_all_statuses(auth_host, other_host):
    client, host = auth_host
    GardenFactory(host=host, title="Moja-approved")
    GardenFactory(host=host, title="Moja-pending", verification_status=Garden.Verification.PENDING)
    GardenFactory(host=other_host, title="Cudza")

    response = client.get(HOST_LIST_URL)

    assert response.status_code == 200
    assert _titles(response) == {"Moja-approved", "Moja-pending"}


def test_host_create_garden_is_pending(auth_host):
    client, host = auth_host
    response = client.post(HOST_LIST_URL, _create_payload(), format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["verification_status"] == "pending"
    assert body["host"]["full_name"]
    garden = Garden.objects.get(pk=body["id"])
    assert garden.host == host


def test_host_create_forbidden_for_client(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    assert api_client.post(HOST_LIST_URL, _create_payload(), format="json").status_code == 403


@pytest.mark.parametrize(
    "payload,bad_field",
    [
        ({"title": ""}, "title"),
        ({"price_per_hour": "0"}, "price_per_hour"),
        ({"latitude": "120"}, "latitude"),
        ({"area_m2": 0}, "area_m2"),
        ({"open_from": "20:00:00", "open_to": "08:00:00"}, "open_to"),
        ({"amenities": ["nope"]}, "amenities"),
    ],
)
def test_host_create_validation(auth_host, payload, bad_field):
    client, _ = auth_host
    response = client.post(HOST_LIST_URL, _create_payload(**payload), format="json")
    assert response.status_code == 400
    assert bad_field in response.json()


# --- host detail / update / delete ----------------------------------------------------


def test_host_retrieve_own_pending_garden(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host, verification_status=Garden.Verification.PENDING)
    assert client.get(_host_detail_url(garden.pk)).status_code == 200


def test_host_cannot_access_foreign_garden(auth_host, other_host):
    client, _ = auth_host
    foreign = GardenFactory(host=other_host)
    url = _host_detail_url(foreign.pk)
    assert client.get(url).status_code == 404
    assert client.patch(url, {"title": "x"}, format="json").status_code == 404
    assert client.delete(url).status_code == 404


def test_host_patch_price_keeps_status(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host, verification_status=Garden.Verification.APPROVED)
    response = client.patch(_host_detail_url(garden.pk), {"price_per_hour": "55.00"}, format="json")
    assert response.status_code == 200
    assert response.json()["verification_status"] == "approved"


def test_host_patch_location_triggers_reverification(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host, verification_status=Garden.Verification.APPROVED)
    response = client.patch(_host_detail_url(garden.pk), {"city": "Gdańsk"}, format="json")
    assert response.status_code == 200
    assert response.json()["verification_status"] == "pending"


def test_host_delete_garden(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host)
    assert client.delete(_host_detail_url(garden.pk)).status_code == 204
    assert not Garden.objects.filter(pk=garden.pk).exists()


# --- host photos ----------------------------------------------------------------------


def test_host_upload_photo(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host, verification_status=Garden.Verification.PENDING)
    response = client.post(_photos_url(garden.pk), {"image": _image_file()}, format="multipart")

    assert response.status_code == 201
    body = response.json()
    assert body["image"] and body["thumbnail"]
    assert body["position"] == 0
    assert garden.photos.count() == 1


def test_host_upload_photo_foreign_garden_404(auth_host, other_host):
    client, _ = auth_host
    foreign = GardenFactory(host=other_host)
    response = client.post(_photos_url(foreign.pk), {"image": _image_file()}, format="multipart")
    assert response.status_code == 404


def test_host_upload_rejects_non_image(auth_host):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client, host = auth_host
    garden = GardenFactory(host=host)
    bad = SimpleUploadedFile("x.jpg", b"not an image", content_type="image/jpeg")
    response = client.post(_photos_url(garden.pk), {"image": bad}, format="multipart")
    assert response.status_code == 400


def test_host_delete_photo(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host)
    photo = GardenPhotoFactory(garden=garden)
    assert client.delete(_photo_detail_url(garden.pk, photo.pk)).status_code == 204
    assert garden.photos.count() == 0


def test_host_reorder_photos(auth_host):
    client, host = auth_host
    garden = GardenFactory(host=host)
    p0 = GardenPhotoFactory(garden=garden, position=0)
    p1 = GardenPhotoFactory(garden=garden, position=1)

    response = client.patch(_reorder_url(garden.pk), {"photo_ids": [p1.id, p0.id]}, format="json")

    assert response.status_code == 200
    p0.refresh_from_db()
    p1.refresh_from_db()
    assert (p1.position, p0.position) == (0, 1)


def test_host_photo_endpoints_require_host_role(api_client, client_user):
    garden = GardenFactory()
    api_client.force_authenticate(user=client_user)
    response = api_client.post(_photos_url(garden.pk), {"image": _image_file()}, format="multipart")
    assert response.status_code == 403
