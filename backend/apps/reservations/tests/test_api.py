from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.dogs.tests.factories import DogFactory
from apps.gardens.tests.factories import GardenFactory, GardenPhotoFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status

LIST_URL = reverse("reservation-list")
HOST_LIST_URL = reverse("host-reservation-list")
SCHEDULE_URL = reverse("host-schedule")
STATS_URL = reverse("host-stats")
EXPORT_URL = reverse("reservation-export")


def _detail_url(pk):
    return reverse("reservation-detail", args=[pk])


def _cancel_url(pk):
    return reverse("reservation-cancel", args=[pk])


def _accept_url(pk):
    return reverse("host-reservation-accept", args=[pk])


def _reject_url(pk):
    return reverse("host-reservation-reject", args=[pk])


def _window(days=3, hour=10, length=2):
    start = (timezone.localtime(timezone.now()) + timedelta(days=days)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    return start, start + timedelta(hours=length)


def _payload(garden, dog, start, end, **overrides):
    data = {
        "garden": garden.id,
        "dog": dog.id,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "dogs_count": 1,
        "message_to_host": "Łata, 18 kg",
    }
    data.update(overrides)
    return data


# --- create ---------------------------------------------------------------------------


def test_create_returns_201_with_contract_shape(auth_client, garden, dog, booking_window):
    client, _ = auth_client
    start, end = booking_window
    response = client.post(LIST_URL, _payload(garden, dog, start, end), format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending_payment"
    assert body["garden"]["id"] == garden.id
    assert body["garden"]["title"] and body["garden"]["city"]
    assert body["dog"]["id"] == dog.id
    assert body["price_per_hour_snapshot"] == "45.00"
    assert body["subtotal"] == "90.00"
    assert body["service_fee"] == "9.00"
    assert body["total_price"] == "99.00"
    assert body["expires_at"]


def test_create_requires_auth(api_client, garden, dog, booking_window):
    start, end = booking_window
    response = api_client.post(LIST_URL, _payload(garden, dog, start, end), format="json")
    assert response.status_code == 401


def test_create_forbidden_for_host(api_client, host_user, garden, dog, booking_window):
    api_client.force_authenticate(user=host_user)
    start, end = booking_window
    response = api_client.post(LIST_URL, _payload(garden, dog, start, end), format="json")
    assert response.status_code == 403


def test_create_validation_returns_400(auth_client, garden, dog, booking_window):
    client, _ = auth_client
    start, end = booking_window
    response = client.post(
        LIST_URL, _payload(garden, dog, start, end, dogs_count=99), format="json"
    )
    assert response.status_code == 400
    assert "dogs_count" in response.json()


def test_create_conflict_returns_409_with_code(auth_client, garden, dog, booking_window):
    client, _ = auth_client
    start, end = booking_window
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.AWAITING_HOST,
        paid_at=timezone.now(),
    )
    response = client.post(LIST_URL, _payload(garden, dog, start, end), format="json")
    assert response.status_code == 409
    assert response.json()["code"] == "slot_unavailable"


def test_create_unvaccinated_dog_returns_400_with_code(
    api_client, client_user, garden, booking_window
):
    api_client.force_authenticate(user=client_user)
    unvaccinated = DogFactory(owner=client_user, vaccinations_valid_until=None)
    start, end = booking_window
    response = api_client.post(LIST_URL, _payload(garden, unvaccinated, start, end), format="json")
    assert response.status_code == 400
    assert response.json()["code"] == "dog_vaccination_required"


# --- client list ----------------------------------------------------------------------


def test_list_returns_only_own_reservations(auth_client, garden, other_client):
    client, user = auth_client
    mine = ReservationFactory(client=user, garden=garden)
    ReservationFactory(client=other_client, garden=garden)

    response = client.get(LIST_URL)
    assert response.status_code == 200
    assert {row["id"] for row in response.json()["results"]} == {mine.id}


def test_list_filters_by_status_group(auth_client, garden):
    client, user = auth_client
    start, end = _window()
    upcoming = ReservationFactory(
        client=user,
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
        start_time=start,
        end_time=end,
    )
    ReservationFactory(client=user, garden=garden, status=_Status.CANCELLED)

    response = client.get(LIST_URL, {"status_group": "upcoming"})
    assert {row["id"] for row in response.json()["results"]} == {upcoming.id}


def test_list_rejects_unknown_status_group(auth_client):
    client, _ = auth_client
    assert client.get(LIST_URL, {"status_group": "nope"}).status_code == 400


def test_list_forbidden_for_host(auth_host):
    client, _ = auth_host
    assert client.get(LIST_URL).status_code == 403


def test_client_list_query_budget(auth_client, garden, django_assert_max_num_queries):
    client, user = auth_client
    GardenPhotoFactory(garden=garden, position=0)
    for hour in (10, 12, 14):
        start, end = _window(hour=hour)
        ReservationFactory(client=user, garden=garden, start_time=start, end_time=end)
    with django_assert_max_num_queries(6):
        assert client.get(LIST_URL).status_code == 200


# --- detail ---------------------------------------------------------------------------


def test_detail_visible_to_both_participants(api_client, garden, client_user):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    api_client.force_authenticate(user=client_user)
    assert api_client.get(_detail_url(reservation.id)).status_code == 200
    api_client.force_authenticate(user=garden.host)
    assert api_client.get(_detail_url(reservation.id)).status_code == 200


def test_detail_hidden_from_stranger(api_client, garden, client_user, other_client):
    reservation = ReservationFactory(client=client_user, garden=garden)
    api_client.force_authenticate(user=other_client)
    assert api_client.get(_detail_url(reservation.id)).status_code == 404


def test_detail_requires_auth(api_client, garden, client_user):
    reservation = ReservationFactory(client=client_user, garden=garden)
    assert api_client.get(_detail_url(reservation.id)).status_code == 401


# --- cancel ---------------------------------------------------------------------------


def test_cancel_returns_refunded_flag(auth_client, garden):
    client, user = auth_client
    reservation = ReservationFactory(
        client=user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    response = client.post(_cancel_url(reservation.id))

    assert response.status_code == 200
    body = response.json()
    assert body["refunded"] is True
    assert body["reservation"]["status"] == "cancelled"


def test_cancel_invalid_state_returns_409(auth_client, garden):
    client, user = auth_client
    reservation = ReservationFactory(client=user, garden=garden, status=_Status.CANCELLED)
    response = client.post(_cancel_url(reservation.id))
    assert response.status_code == 409
    assert response.json()["code"] == "reservation_state_invalid"


def test_cancel_foreign_returns_404(api_client, garden, client_user, other_client):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    api_client.force_authenticate(user=other_client)
    assert api_client.post(_cancel_url(reservation.id)).status_code == 404


def test_cancel_forbidden_for_host(api_client, host_user, garden, client_user):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    api_client.force_authenticate(user=host_user)
    assert api_client.post(_cancel_url(reservation.id)).status_code == 403


# --- host list ------------------------------------------------------------------------


def test_host_list_shows_only_paid_on_own_gardens(auth_host, garden, other_host):
    client, host = auth_host
    paid = ReservationFactory(garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now())
    ReservationFactory(garden=garden, status=_Status.PENDING_PAYMENT)  # unpaid → hidden
    foreign = GardenFactory(host=other_host)
    ReservationFactory(garden=foreign, status=_Status.AWAITING_HOST, paid_at=timezone.now())

    response = client.get(HOST_LIST_URL)
    assert response.status_code == 200
    assert {row["id"] for row in response.json()["results"]} == {paid.id}


def test_host_list_forbidden_for_client(auth_client):
    client, _ = auth_client
    assert client.get(HOST_LIST_URL).status_code == 403


def test_host_list_query_budget(auth_host, garden, django_assert_max_num_queries):
    client, host = auth_host
    GardenPhotoFactory(garden=garden, position=0)
    for hour in (10, 12, 14):
        start, end = _window(hour=hour)
        ReservationFactory(
            garden=garden,
            status=_Status.AWAITING_HOST,
            paid_at=timezone.now(),
            start_time=start,
            end_time=end,
        )
    with django_assert_max_num_queries(6):
        assert client.get(HOST_LIST_URL).status_code == 200


# --- host accept / reject -------------------------------------------------------------


def test_host_accept_confirms(auth_host, garden):
    client, host = auth_host
    reservation = ReservationFactory(
        garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    response = client.post(_accept_url(reservation.id))
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


def test_host_accept_foreign_returns_404(auth_host, other_host):
    client, host = auth_host
    foreign = GardenFactory(host=other_host)
    reservation = ReservationFactory(
        garden=foreign, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    assert client.post(_accept_url(reservation.id)).status_code == 404


def test_host_accept_non_awaiting_returns_409(auth_host, garden):
    client, host = auth_host
    reservation = ReservationFactory(
        garden=garden, status=_Status.CONFIRMED, paid_at=timezone.now()
    )
    response = client.post(_accept_url(reservation.id))
    assert response.status_code == 409
    assert response.json()["code"] == "reservation_state_invalid"


def test_accept_forbidden_for_client(api_client, client_user, garden):
    reservation = ReservationFactory(
        garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    api_client.force_authenticate(user=client_user)
    assert api_client.post(_accept_url(reservation.id)).status_code == 403


def test_host_reject_with_reason(auth_host, garden):
    client, host = auth_host
    reservation = ReservationFactory(
        garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    response = client.post(_reject_url(reservation.id), {"reason": "Brak miejsc"}, format="json")
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


# --- host schedule / stats ------------------------------------------------------------


def test_host_schedule_returns_events(auth_host, garden):
    client, host = auth_host
    start, end = _window()
    ReservationFactory(
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
        start_time=start,
        end_time=end,
    )
    response = client.get(
        SCHEDULE_URL, {"from": start.date().isoformat(), "to": start.date().isoformat()}
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["garden_title"] == garden.title


def test_host_schedule_requires_dates(auth_host):
    client, _ = auth_host
    assert client.get(SCHEDULE_URL).status_code == 400


def test_host_stats_shape(auth_host, garden):
    client, host = auth_host
    ReservationFactory(garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now())
    body = client.get(STATS_URL).json()
    assert set(body) == {
        "pending_count",
        "upcoming_count",
        "completed_count",
        "total_earnings",
        "rating_avg",
    }
    assert body["pending_count"] == 1


def test_stats_forbidden_for_client(auth_client):
    client, _ = auth_client
    assert client.get(STATS_URL).status_code == 403


# --- CSV export -----------------------------------------------------------------------


def test_csv_export_downloads_own_reservations(auth_client, garden):
    client, user = auth_client
    ReservationFactory(client=user, garden=garden)
    response = client.get(EXPORT_URL)

    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/csv")
    assert "attachment" in response["Content-Disposition"]
    assert "ogrod" in response.content.decode("utf-8")


def test_csv_export_forbidden_for_host(auth_host):
    client, _ = auth_host
    assert client.get(EXPORT_URL).status_code == 403
