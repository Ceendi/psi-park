from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from django.core import mail
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.utils import timezone
from freezegun import freeze_time
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from apps.core.exceptions import (
    DogVaccinationRequired,
    InvalidStateTransition,
    SlotUnavailable,
)
from apps.dogs.tests.factories import DogFactory
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory
from apps.reservations import selectors, services
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status


def _window(*, days=3, hour=10, length=2):
    start = (timezone.localtime(timezone.now()) + timedelta(days=days)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    return start, start + timedelta(hours=length)


def _create(client_user, garden, dog, start, end, **kwargs):
    return services.create_reservation(
        client=client_user,
        garden_id=garden.id,
        dog_id=dog.id,
        start_time=start,
        end_time=end,
        **kwargs,
    )


# --- create: happy path + amounts -----------------------------------------------------


def test_create_reservation_happy_path(client_user, garden, dog, booking_window):
    start, end = booking_window
    reservation = _create(
        client_user, garden, dog, start, end, dogs_count=2, message_to_host="Łata"
    )

    assert reservation.status == _Status.PENDING_PAYMENT
    assert reservation.dogs_count == 2
    assert reservation.message_to_host == "Łata"
    assert reservation.expires_at is not None
    assert reservation.client == client_user


def test_create_snapshots_price_and_computes_amounts(client_user, garden, dog, booking_window):
    start, end = booking_window  # 2 hours
    reservation = _create(client_user, garden, dog, start, end)

    assert reservation.price_per_hour_snapshot == Decimal("45.00")
    assert reservation.subtotal == Decimal("90.00")  # 2h * 45
    assert reservation.service_fee == Decimal("9.00")  # 10% platform fee
    assert reservation.total_price == Decimal("99.00")


def test_create_rounds_service_fee_half_up(client_user, garden, dog, booking_window):
    garden.price_per_hour = Decimal("33.33")
    garden.save(update_fields=["price_per_hour"])
    start, end = booking_window  # 2 hours

    reservation = _create(client_user, garden, dog, start, end)

    assert reservation.subtotal == Decimal("66.66")
    assert reservation.service_fee == Decimal("6.67")  # 6.666 -> 6.67
    assert reservation.total_price == Decimal("73.33")


def test_create_sets_ttl_from_settings(settings, client_user, garden, dog, booking_window):
    settings.RESERVATION_PAYMENT_TTL_MINUTES = 30
    start, end = booking_window
    before = timezone.now()

    reservation = _create(client_user, garden, dog, start, end)

    assert (
        before + timedelta(minutes=29) <= reservation.expires_at <= before + timedelta(minutes=31)
    )


def test_create_emails_host(client_user, garden, dog, booking_window):
    start, end = booking_window
    _create(client_user, garden, dog, start, end)

    assert len(mail.outbox) == 1
    assert garden.host.email in mail.outbox[0].to


# --- create: validation ---------------------------------------------------------------


def test_create_rejects_window_outside_opening_hours(client_user, garden, dog):
    start, end = _window(hour=7)  # opens at 08:00
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, start, end)
    assert "start_time" in exc.value.detail


def test_create_rejects_end_after_closing(client_user, garden, dog):
    start, end = _window(hour=19, length=2)  # 19-21, closes 20:00
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, start, end)
    assert "start_time" in exc.value.detail


def test_create_rejects_non_whole_hours(client_user, garden, dog, booking_window):
    start, end = booking_window
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, start + timedelta(minutes=30), end)
    assert "start_time" in exc.value.detail


def test_create_rejects_past_window(client_user, garden, dog):
    start, end = _window(days=-1)
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, start, end)
    assert "start_time" in exc.value.detail


def test_create_rejects_below_min_booking_hours(client_user, garden, dog):
    garden.min_booking_hours = 3
    garden.save(update_fields=["min_booking_hours"])
    start, end = _window(length=1)
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, start, end)
    assert "end_time" in exc.value.detail


def test_create_rejects_reversed_window(client_user, garden, dog, booking_window):
    start, end = booking_window
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, end, start)
    assert "end_time" in exc.value.detail


def test_create_rejects_too_many_dogs(client_user, garden, dog, booking_window):
    start, end = booking_window
    with pytest.raises(serializers.ValidationError) as exc:
        _create(client_user, garden, dog, start, end, dogs_count=garden.max_dogs + 1)
    assert "dogs_count" in exc.value.detail


def test_create_rejects_foreign_dog(client_user, other_client, garden, booking_window):
    foreign = DogFactory(owner=other_client, vaccinations_valid_until=date(2031, 1, 1))
    start, end = booking_window
    with pytest.raises(serializers.ValidationError) as exc:
        services.create_reservation(
            client=client_user,
            garden_id=garden.id,
            dog_id=foreign.id,
            start_time=start,
            end_time=end,
        )
    assert "dog" in exc.value.detail


def test_create_rejects_unapproved_garden(client_user, host_user, dog, booking_window):
    pending = GardenFactory(host=host_user, verification_status=Garden.Verification.PENDING)
    start, end = booking_window
    with pytest.raises(serializers.ValidationError) as exc:
        services.create_reservation(
            client=client_user,
            garden_id=pending.id,
            dog_id=dog.id,
            start_time=start,
            end_time=end,
        )
    assert "garden" in exc.value.detail


def test_create_rejects_dog_without_vaccination(client_user, garden, booking_window):
    unvaccinated = DogFactory(owner=client_user, vaccinations_valid_until=None)
    start, end = booking_window
    with pytest.raises(DogVaccinationRequired):
        services.create_reservation(
            client=client_user,
            garden_id=garden.id,
            dog_id=unvaccinated.id,
            start_time=start,
            end_time=end,
        )


def test_create_rejects_dog_with_expired_vaccination(client_user, garden, booking_window):
    start, end = booking_window
    expired = DogFactory(
        owner=client_user, vaccinations_valid_until=start.date() - timedelta(days=1)
    )
    with pytest.raises(DogVaccinationRequired):
        services.create_reservation(
            client=client_user,
            garden_id=garden.id,
            dog_id=expired.id,
            start_time=start,
            end_time=end,
        )


# --- create: anti-collision (layer 1, service) ----------------------------------------


def test_create_collision_raises_slot_unavailable(client_user, garden, dog, booking_window):
    start, end = booking_window
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )
    with pytest.raises(SlotUnavailable):
        _create(client_user, garden, dog, start, end)


def test_create_partial_overlap_collides(client_user, garden, dog, booking_window):
    start, end = booking_window  # 10-12
    ReservationFactory(
        garden=garden,
        start_time=start + timedelta(hours=1),
        end_time=end + timedelta(hours=1),
        status=_Status.AWAITING_HOST,
        paid_at=timezone.now(),
    )  # 11-13
    with pytest.raises(SlotUnavailable):
        _create(client_user, garden, dog, start, end)


def test_create_adjacent_window_does_not_collide(client_user, garden, dog, booking_window):
    start, end = booking_window  # 10-12
    ReservationFactory(
        garden=garden,
        start_time=end,
        end_time=end + timedelta(hours=2),
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )  # 12-14
    reservation = _create(client_user, garden, dog, start, end)
    assert reservation.status == _Status.PENDING_PAYMENT


def test_create_active_pending_blocks(client_user, garden, dog, booking_window):
    start, end = booking_window
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.PENDING_PAYMENT,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    with pytest.raises(SlotUnavailable):
        _create(client_user, garden, dog, start, end)


def test_create_expired_pending_does_not_block(client_user, garden, dog, booking_window):
    start, end = booking_window
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.PENDING_PAYMENT,
        expires_at=timezone.now() - timedelta(minutes=1),
    )
    reservation = _create(client_user, garden, dog, start, end)
    assert reservation.status == _Status.PENDING_PAYMENT


def test_create_cancelled_reservation_frees_slot(client_user, garden, dog, booking_window):
    start, end = booking_window
    ReservationFactory(garden=garden, start_time=start, end_time=end, status=_Status.CANCELLED)
    reservation = _create(client_user, garden, dog, start, end)
    assert reservation.status == _Status.PENDING_PAYMENT


# --- anti-collision (layer 2, database exclusion constraint) --------------------------


def test_db_constraint_blocks_overlapping_committed(garden):
    start, end = _window(days=5)
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        ReservationFactory(
            garden=garden,
            start_time=start + timedelta(hours=1),
            end_time=end + timedelta(hours=1),
            status=_Status.CONFIRMED,
            paid_at=timezone.now(),
        )


def test_db_constraint_allows_overlap_on_different_gardens(garden, other_host):
    other = GardenFactory(host=other_host)
    start, end = _window(days=5)
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )
    # Same window, different garden — allowed.
    ReservationFactory(
        garden=other,
        start_time=start,
        end_time=end,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )
    assert Reservation.objects.filter(status=_Status.CONFIRMED).count() == 2


# --- state machine --------------------------------------------------------------------


@pytest.mark.parametrize(
    "source,target",
    [
        (_Status.PENDING_PAYMENT, _Status.AWAITING_HOST),
        (_Status.PENDING_PAYMENT, _Status.CANCELLED),
        (_Status.AWAITING_HOST, _Status.CONFIRMED),
        (_Status.AWAITING_HOST, _Status.REJECTED),
        (_Status.AWAITING_HOST, _Status.CANCELLED),
        (_Status.CONFIRMED, _Status.CANCELLED),
    ],
)
def test_transition_allows_valid_edges(source, target):
    reservation = ReservationFactory(status=source)
    services.transition(reservation=reservation, target=target)
    reservation.refresh_from_db()
    assert reservation.status == target


@pytest.mark.parametrize(
    "source,target",
    [
        (_Status.PENDING_PAYMENT, _Status.CONFIRMED),
        (_Status.PENDING_PAYMENT, _Status.REJECTED),
        (_Status.AWAITING_HOST, _Status.PENDING_PAYMENT),
        (_Status.CONFIRMED, _Status.AWAITING_HOST),
        (_Status.CONFIRMED, _Status.REJECTED),
        (_Status.CANCELLED, _Status.CONFIRMED),
        (_Status.REJECTED, _Status.CANCELLED),
    ],
)
def test_transition_rejects_invalid_edges(source, target):
    reservation = ReservationFactory(status=source)
    with pytest.raises(InvalidStateTransition):
        services.transition(reservation=reservation, target=target)


def test_transition_to_awaiting_host_marks_paid_and_clears_ttl():
    reservation = ReservationFactory(
        status=_Status.PENDING_PAYMENT, expires_at=timezone.now() + timedelta(minutes=10)
    )
    services.transition(reservation=reservation, target=_Status.AWAITING_HOST)
    reservation.refresh_from_db()
    assert reservation.paid_at is not None
    assert reservation.expires_at is None


def test_transition_to_confirmed_stamps_decided_at():
    reservation = ReservationFactory(status=_Status.AWAITING_HOST, paid_at=timezone.now())
    services.transition(reservation=reservation, target=_Status.CONFIRMED)
    reservation.refresh_from_db()
    assert reservation.decided_at is not None


# --- host decisions -------------------------------------------------------------------


def test_accept_reservation_confirms_and_emails_client(host_user, garden):
    reservation = ReservationFactory(
        garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    services.accept_reservation(host=host_user, reservation_id=reservation.id)

    reservation.refresh_from_db()
    assert reservation.status == _Status.CONFIRMED
    assert len(mail.outbox) == 1
    assert reservation.client.email in mail.outbox[0].to


def test_reject_reservation_rejects_and_emails_client(host_user, garden):
    reservation = ReservationFactory(
        garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    services.reject_reservation(host=host_user, reservation_id=reservation.id, reason="Brak miejsc")

    reservation.refresh_from_db()
    assert reservation.status == _Status.REJECTED
    assert len(mail.outbox) == 1


def test_accept_foreign_reservation_raises_not_found(other_host, garden):
    reservation = ReservationFactory(
        garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    with pytest.raises(NotFound):
        services.accept_reservation(host=other_host, reservation_id=reservation.id)


def test_accept_non_awaiting_raises_invalid_transition(host_user, garden):
    reservation = ReservationFactory(
        garden=garden, status=_Status.CONFIRMED, paid_at=timezone.now()
    )
    with pytest.raises(InvalidStateTransition):
        services.accept_reservation(host=host_user, reservation_id=reservation.id)


# --- client cancellation + 24h policy -------------------------------------------------


def test_cancel_pending_lapses_without_refund(client_user, garden):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.PENDING_PAYMENT
    )
    result, refunded = services.cancel_reservation(
        client=client_user, reservation_id=reservation.id
    )
    assert result.status == _Status.CANCELLED
    assert refunded is False


def test_cancel_awaiting_host_refunds(client_user, garden):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    _, refunded = services.cancel_reservation(client=client_user, reservation_id=reservation.id)
    assert refunded is True


def test_cancel_confirmed_outside_24h_refunds(client_user, garden):
    start = timezone.make_aware(datetime(2026, 9, 10, 15, 0))
    reservation = ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        start_time=start,
        end_time=start + timedelta(hours=2),
        paid_at=timezone.now(),
    )
    with freeze_time("2026-09-08 12:00:00"):  # > 24h before start
        _, refunded = services.cancel_reservation(client=client_user, reservation_id=reservation.id)
    assert refunded is True


def test_cancel_confirmed_within_24h_no_refund(client_user, garden):
    start = timezone.make_aware(datetime(2026, 9, 10, 15, 0))
    reservation = ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        start_time=start,
        end_time=start + timedelta(hours=2),
        paid_at=timezone.now(),
    )
    with freeze_time("2026-09-10 06:00:00"):  # 9h before start
        _, refunded = services.cancel_reservation(client=client_user, reservation_id=reservation.id)
    assert refunded is False


def test_cancel_emails_host(client_user, garden):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    services.cancel_reservation(client=client_user, reservation_id=reservation.id)
    assert len(mail.outbox) == 1
    assert garden.host.email in mail.outbox[0].to


def test_cancel_already_cancelled_raises(client_user, garden):
    reservation = ReservationFactory(client=client_user, garden=garden, status=_Status.CANCELLED)
    with pytest.raises(InvalidStateTransition):
        services.cancel_reservation(client=client_user, reservation_id=reservation.id)


def test_cancel_foreign_reservation_raises_not_found(client_user, other_client, garden):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    with pytest.raises(NotFound):
        services.cancel_reservation(client=other_client, reservation_id=reservation.id)


def test_refund_facade_is_noop_without_payments_app(client_user, garden):
    # The payments app (B5) is not installed yet, so the refund facade is a no-op and the
    # cancel still succeeds (PLAN 15-B4 / 17.3).
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    result, refunded = services.cancel_reservation(
        client=client_user, reservation_id=reservation.id
    )
    assert result.status == _Status.CANCELLED
    assert refunded is True


# --- expiry (AD-11) -------------------------------------------------------------------


def test_expire_pending_reservations_cancels_only_stale():
    stale = ReservationFactory(
        status=_Status.PENDING_PAYMENT, expires_at=timezone.now() - timedelta(minutes=1)
    )
    fresh = ReservationFactory(
        status=_Status.PENDING_PAYMENT, expires_at=timezone.now() + timedelta(minutes=10)
    )
    count = services.expire_pending_reservations()

    stale.refresh_from_db()
    fresh.refresh_from_db()
    assert count == 1
    assert stale.status == _Status.CANCELLED
    assert stale.cancelled_at is not None
    assert fresh.status == _Status.PENDING_PAYMENT


def test_expiry_respects_the_clock():
    with freeze_time("2026-09-01 10:00:00"):
        ReservationFactory(
            status=_Status.PENDING_PAYMENT, expires_at=timezone.now() + timedelta(minutes=30)
        )
        assert services.expire_pending_reservations() == 0  # not yet elapsed
    with freeze_time("2026-09-01 10:31:00"):
        assert services.expire_pending_reservations() == 1  # now past TTL


def test_cleanup_command_expires_stale_holds():
    ReservationFactory(
        status=_Status.PENDING_PAYMENT, expires_at=timezone.now() - timedelta(minutes=5)
    )
    call_command("cleanup_expired_reservations")
    assert Reservation.objects.filter(status=_Status.CANCELLED).count() == 1


# --- selectors: collision rule + stats ------------------------------------------------


def test_busy_intervals_returns_active_windows(garden):
    start, end = _window(days=3, hour=15)
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )
    intervals = selectors.busy_intervals(
        garden=garden, date_range=(start - timedelta(hours=2), end + timedelta(hours=2))
    )
    assert (start, end) in intervals


def test_busy_intervals_excludes_expired_pending(garden):
    start, end = _window(days=3, hour=15)
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.PENDING_PAYMENT,
        expires_at=timezone.now() - timedelta(minutes=1),
    )
    assert selectors.busy_intervals(garden=garden, date_range=(start, end)) == []


def test_has_collision_reflects_active_reservations(garden):
    start, end = _window(days=3, hour=15)
    assert selectors.has_collision(garden_id=garden.id, start_time=start, end_time=end) is False
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.AWAITING_HOST,
        paid_at=timezone.now(),
    )
    assert selectors.has_collision(garden_id=garden.id, start_time=start, end_time=end) is True


def test_host_stats_counts_earnings_and_rating(host_user, garden):
    def confirmed(days):
        start, end = _window(days=days)
        return ReservationFactory(
            garden=garden,
            status=_Status.CONFIRMED,
            paid_at=timezone.now(),
            start_time=start,
            end_time=end,
            subtotal=Decimal("90.00"),
        )

    confirmed(days=2)  # upcoming
    confirmed(days=4)  # upcoming
    confirmed(days=-5)  # completed (past)
    awaiting_start, awaiting_end = _window(days=6)
    ReservationFactory(
        garden=garden,
        status=_Status.AWAITING_HOST,
        paid_at=timezone.now(),
        start_time=awaiting_start,
        end_time=awaiting_end,
    )

    stats = selectors.host_stats(host=host_user)
    assert stats["pending_count"] == 1
    assert stats["upcoming_count"] == 2
    assert stats["completed_count"] == 1
    assert stats["total_earnings"] == Decimal("270.00")  # 3 confirmed * 90
    assert stats["rating_avg"] is None  # reviews app (B7) not installed


# --- cross-part integration: gardens.availability consumes busy_intervals --------------


def test_gardens_availability_reflects_reservation(garden):
    from apps.gardens import selectors as garden_selectors

    start, end = _window(days=3, hour=15)  # 15-17
    ReservationFactory(
        garden=garden,
        start_time=start,
        end_time=end,
        status=_Status.CONFIRMED,
        paid_at=timezone.now(),
    )
    result = garden_selectors.availability(garden=garden, day=start.date())
    by_hour = {slot["hour"]: slot["available"] for slot in result["slots"]}

    assert by_hour["15:00"] is False
    assert by_hour["16:00"] is False
    assert by_hour["14:00"] is True
    assert by_hour["17:00"] is True


# --- model property -------------------------------------------------------------------


def test_is_expired_property():
    expired = ReservationFactory(
        status=_Status.PENDING_PAYMENT, expires_at=timezone.now() - timedelta(minutes=1)
    )
    active = ReservationFactory(
        status=_Status.PENDING_PAYMENT, expires_at=timezone.now() + timedelta(minutes=5)
    )
    paid = ReservationFactory(status=_Status.CONFIRMED, expires_at=None, paid_at=timezone.now())

    assert expired.is_expired is True
    assert active.is_expired is False
    assert paid.is_expired is False
