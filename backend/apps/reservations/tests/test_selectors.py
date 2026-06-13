from datetime import timedelta

import pytest
from django.utils import timezone

from apps.gardens.tests.factories import GardenFactory
from apps.reservations import selectors
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status


def _win(days, hour=10):
    start = (timezone.localtime(timezone.now()) + timedelta(days=days)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    return start, start + timedelta(hours=2)


# --- client status groups -------------------------------------------------------------


def test_client_reservations_upcoming_excludes_finished_and_cancelled(client_user, garden):
    up_start, up_end = _win(5)
    upcoming = ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
        start_time=up_start,
        end_time=up_end,
    )
    past_start, past_end = _win(-5)
    ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
        start_time=past_start,
        end_time=past_end,
    )
    ReservationFactory(client=client_user, garden=garden, status=_Status.CANCELLED)

    ids = set(
        selectors.client_reservations(client=client_user, status_group="upcoming").values_list(
            "id", flat=True
        )
    )
    assert ids == {upcoming.id}


def test_client_reservations_completed(client_user, garden):
    start, end = _win(-5)
    done = ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
        start_time=start,
        end_time=end,
    )
    fut_start, fut_end = _win(5)
    ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
        start_time=fut_start,
        end_time=fut_end,
    )

    ids = set(
        selectors.client_reservations(client=client_user, status_group="completed").values_list(
            "id", flat=True
        )
    )
    assert ids == {done.id}


def test_client_reservations_cancelled_includes_rejected(client_user, garden):
    cancelled = ReservationFactory(client=client_user, garden=garden, status=_Status.CANCELLED)
    rejected = ReservationFactory(
        client=client_user, garden=garden, status=_Status.REJECTED, paid_at=timezone.now()
    )
    ReservationFactory(client=client_user, garden=garden, status=_Status.PENDING_PAYMENT)

    ids = set(
        selectors.client_reservations(client=client_user, status_group="cancelled").values_list(
            "id", flat=True
        )
    )
    assert ids == {cancelled.id, rejected.id}


# --- host status groups ---------------------------------------------------------------


def test_host_reservations_status_groups(host_user, garden):
    now = timezone.now()
    p_start, p_end = _win(2)
    pending = ReservationFactory(
        garden=garden,
        status=_Status.AWAITING_HOST,
        paid_at=now,
        start_time=p_start,
        end_time=p_end,
    )
    a_start, a_end = _win(4)
    accepted = ReservationFactory(
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=now,
        start_time=a_start,
        end_time=a_end,
    )
    c_start, c_end = _win(-6)
    completed = ReservationFactory(
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=now,
        start_time=c_start,
        end_time=c_end,
    )
    cancelled = ReservationFactory(garden=garden, status=_Status.CANCELLED, paid_at=now)

    def ids(group):
        return set(
            selectors.host_reservations(host=host_user, status_group=group).values_list(
                "id", flat=True
            )
        )

    assert ids("pending") == {pending.id}
    assert ids("accepted") == {accepted.id}
    assert ids("completed") == {completed.id}
    assert ids("cancelled") == {cancelled.id}


def test_host_reservations_can_filter_by_garden(host_user, garden):
    other = GardenFactory(host=host_user)
    now = timezone.now()
    here = ReservationFactory(garden=garden, status=_Status.AWAITING_HOST, paid_at=now)
    ReservationFactory(garden=other, status=_Status.AWAITING_HOST, paid_at=now)

    ids = set(
        selectors.host_reservations(host=host_user, garden_id=garden.id).values_list(
            "id", flat=True
        )
    )
    assert ids == {here.id}


# --- schedule + participants ----------------------------------------------------------


def test_host_schedule_only_committed_and_respects_garden_filter(host_user, garden):
    other = GardenFactory(host=host_user)
    now = timezone.now()
    c_start, c_end = _win(3, hour=10)
    confirmed = ReservationFactory(
        garden=garden,
        status=_Status.CONFIRMED,
        paid_at=now,
        start_time=c_start,
        end_time=c_end,
    )
    p_start, p_end = _win(3, hour=14)
    ReservationFactory(
        garden=garden, status=_Status.PENDING_PAYMENT, start_time=p_start, end_time=p_end
    )  # holds no calendar slot
    o_start, o_end = _win(3, hour=16)
    ReservationFactory(
        garden=other, status=_Status.CONFIRMED, paid_at=now, start_time=o_start, end_time=o_end
    )

    events = selectors.host_schedule(
        host=host_user,
        start=c_start - timedelta(days=1),
        end=c_end + timedelta(days=1),
        garden_id=garden.id,
    )
    assert {event.id for event in events} == {confirmed.id}


def test_participant_reservations_covers_client_and_host_only(
    client_user, host_user, garden, other_client
):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )

    def visible_to(user):
        return reservation.id in set(
            selectors.participant_reservations(user=user).values_list("id", flat=True)
        )

    assert visible_to(client_user) is True
    assert visible_to(host_user) is True
    assert visible_to(other_client) is False
