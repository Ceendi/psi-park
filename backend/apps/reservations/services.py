"""Reservation write operations and the booking state machine (PLAN 5.1, 6.2, 15-B4).

Views validate the input shape with a serializer and then call exactly one of these
functions (keyword-only args, PLAN 6.2). This app owns the collision rule and the state
machine (PLAN 7.4.1): ``create_reservation`` locks the garden and checks availability,
``transition`` is the single guarded gate every status change goes through, and
``accept``/``reject``/``cancel`` wrap it with the right side effects (refund + e-mail).

Money is ``Decimal`` throughout, never float (AD-16). Side effects that cross part
boundaries go through facades: e-mail via ``notifications.services`` and refunds via the
``payments`` facade (lazily imported so B4 can ship before B5 — PLAN 17.3).
"""

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.core.exceptions import (
    DogVaccinationRequired,
    InvalidStateTransition,
    SlotUnavailable,
)
from apps.dogs.models import Dog
from apps.gardens.models import Garden
from apps.notifications import services as notifications
from apps.reservations import selectors
from apps.reservations.models import Reservation

_Status = Reservation.Status
_CENTS = Decimal("0.01")

# Allowed state-machine edges (PLAN 7.4.1); any other pair raises InvalidStateTransition.
_ALLOWED_TRANSITIONS: frozenset[tuple[str, str]] = frozenset(
    {
        (_Status.PENDING_PAYMENT, _Status.AWAITING_HOST),
        (_Status.PENDING_PAYMENT, _Status.CANCELLED),
        (_Status.AWAITING_HOST, _Status.CONFIRMED),
        (_Status.AWAITING_HOST, _Status.REJECTED),
        (_Status.AWAITING_HOST, _Status.CANCELLED),
        (_Status.CONFIRMED, _Status.CANCELLED),
    }
)

# Statuses a client may still cancel from.
_CANCELLABLE = (_Status.PENDING_PAYMENT, _Status.AWAITING_HOST, _Status.CONFIRMED)


def _money(value: Decimal) -> Decimal:
    """Quantise to grosze with half-up rounding (AD-16)."""
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def _hours_between(start: datetime, end: datetime) -> int:
    """Whole hours between two whole-hour datetimes (validated upstream)."""
    return round((end - start).total_seconds() / 3600)


# --- create ---------------------------------------------------------------------------


@transaction.atomic
def create_reservation(
    *,
    client: User,
    garden_id: int,
    dog_id: int,
    start_time: datetime,
    end_time: datetime,
    dogs_count: int = 1,
    message_to_host: str = "",
) -> Reservation:
    """Create a pending-payment reservation after validating the window and the dog.

    The garden row is locked (``select_for_update``) so concurrent bookings of the same
    garden are serialised — the first layer of the anti-collision rule; the database
    exclusion constraint is the second (PLAN 7.4.2). Notifies the host on success.

    Raises:
        ValidationError: garden/dog not bookable, window not on whole hours, outside the
            opening window, below ``min_booking_hours`` or above ``max_dogs``.
        DogVaccinationRequired: the dog's vaccinations are missing or expired on the day.
        SlotUnavailable: the window overlaps an active reservation.
    """
    garden = _get_bookable_garden(garden_id=garden_id)
    dog = _get_owned_dog(client=client, dog_id=dog_id)
    _validate_window(garden=garden, start_time=start_time, end_time=end_time)
    _validate_dogs_count(garden=garden, dogs_count=dogs_count)
    _validate_dog_health(dog=dog, on_date=timezone.localtime(start_time).date())
    if selectors.has_collision(garden_id=garden.id, start_time=start_time, end_time=end_time):
        raise SlotUnavailable()

    hours = Decimal(_hours_between(start_time, end_time))
    subtotal = _money(garden.price_per_hour * hours)
    service_fee = _money(subtotal * Decimal(settings.PLATFORM_FEE_PERCENT) / Decimal(100))
    ttl = timedelta(minutes=settings.RESERVATION_PAYMENT_TTL_MINUTES)
    reservation = Reservation.objects.create(
        client=client,
        garden=garden,
        dog=dog,
        dogs_count=dogs_count,
        start_time=start_time,
        end_time=end_time,
        status=_Status.PENDING_PAYMENT,
        price_per_hour_snapshot=garden.price_per_hour,
        subtotal=subtotal,
        service_fee=service_fee,
        total_price=subtotal + service_fee,
        message_to_host=message_to_host,
        expires_at=timezone.now() + ttl,
    )
    _notify("reservation_created", to=garden.host.email, user=garden.host, reservation=reservation)
    return reservation


def _get_bookable_garden(*, garden_id: int) -> Garden:
    try:
        return Garden.objects.select_for_update().get(
            id=garden_id,
            verification_status=Garden.Verification.APPROVED,
            is_active=True,
        )
    except Garden.DoesNotExist as exc:
        raise serializers.ValidationError(
            {"garden": ["Nie znaleziono ogrodu lub nie jest on dostępny do rezerwacji."]}
        ) from exc


def _get_owned_dog(*, client: User, dog_id: int) -> Dog:
    try:
        return Dog.objects.get(id=dog_id, owner=client)
    except Dog.DoesNotExist as exc:
        raise serializers.ValidationError({"dog": ["Nie znaleziono psa."]}) from exc


def _validate_window(*, garden: Garden, start_time: datetime, end_time: datetime) -> None:
    if end_time <= start_time:
        raise serializers.ValidationError(
            {"end_time": ["Koniec rezerwacji musi być po jej początku."]}
        )
    local_start = timezone.localtime(start_time)
    local_end = timezone.localtime(end_time)
    if any(dt.minute or dt.second or dt.microsecond for dt in (local_start, local_end)):
        raise serializers.ValidationError(
            {"start_time": ["Rezerwacja musi obejmować pełne godziny zegarowe."]}
        )
    if start_time <= timezone.now():
        raise serializers.ValidationError(
            {"start_time": ["Nie można rezerwować terminu z przeszłości."]}
        )
    if local_start.date() != local_end.date():
        raise serializers.ValidationError(
            {"end_time": ["Rezerwacja musi mieścić się w jednym dniu."]}
        )
    if local_start.time() < garden.open_from or local_end.time() > garden.open_to:
        raise serializers.ValidationError(
            {
                "start_time": [
                    f"Ogród jest otwarty od {garden.open_from:%H:%M} do {garden.open_to:%H:%M}."
                ]
            }
        )
    if _hours_between(start_time, end_time) < garden.min_booking_hours:
        raise serializers.ValidationError(
            {"end_time": [f"Minimalny czas rezerwacji to {garden.min_booking_hours} godz."]}
        )


def _validate_dogs_count(*, garden: Garden, dogs_count: int) -> None:
    if dogs_count < 1:
        raise serializers.ValidationError({"dogs_count": ["Podaj co najmniej jednego psa."]})
    if dogs_count > garden.max_dogs:
        raise serializers.ValidationError(
            {
                "dogs_count": [
                    f"Ten ogród przyjmuje maksymalnie {garden.max_dogs} psów jednocześnie."
                ]
            }
        )


def _validate_dog_health(*, dog: Dog, on_date) -> None:
    """The dog's vaccinations must be valid on the visit day (PLAN 6.2)."""
    valid_until = dog.vaccinations_valid_until
    if valid_until is None or valid_until < on_date:
        raise DogVaccinationRequired()


# --- state machine --------------------------------------------------------------------


def transition(
    *, reservation: Reservation, target: str, when: datetime | None = None
) -> Reservation:
    """Move ``reservation`` to ``target`` and stamp the matching audit field (PLAN 7.4.1).

    Pure state change: refunds and e-mails belong to the higher-level operations that
    call this. Persists only the touched fields.

    Raises:
        InvalidStateTransition: when ``(current, target)`` is not an allowed edge.
    """
    if (reservation.status, target) not in _ALLOWED_TRANSITIONS:
        raise InvalidStateTransition()
    when = when or timezone.now()
    reservation.status = target
    fields = ["status", "updated_at"]
    if target == _Status.AWAITING_HOST:
        reservation.paid_at = when
        reservation.expires_at = None
        fields += ["paid_at", "expires_at"]
    elif target in (_Status.CONFIRMED, _Status.REJECTED):
        reservation.decided_at = when
        fields.append("decided_at")
    elif target == _Status.CANCELLED:
        reservation.cancelled_at = when
        fields.append("cancelled_at")
    reservation.save(update_fields=fields)
    return reservation


# --- host decisions -------------------------------------------------------------------


@transaction.atomic
def accept_reservation(*, host: User, reservation_id: int) -> Reservation:
    """Host accepts a paid booking: ``awaiting_host → confirmed`` and notify the client."""
    reservation = _lock_reservation(reservation_id=reservation_id, garden__host=host)
    transition(reservation=reservation, target=_Status.CONFIRMED)
    _notify(
        "reservation_accepted",
        to=reservation.client.email,
        user=reservation.client,
        reservation=reservation,
    )
    return reservation


@transaction.atomic
def reject_reservation(*, host: User, reservation_id: int, reason: str = "") -> Reservation:
    """Host rejects a paid booking: ``awaiting_host → rejected``, refund and notify."""
    reservation = _lock_reservation(reservation_id=reservation_id, garden__host=host)
    transition(reservation=reservation, target=_Status.REJECTED)
    _refund_if_paid(reservation=reservation)
    _notify(
        "reservation_rejected",
        to=reservation.client.email,
        user=reservation.client,
        reservation=reservation,
        extra={"reason": reason},
    )
    return reservation


# --- client cancellation --------------------------------------------------------------


@transaction.atomic
def cancel_reservation(*, client: User, reservation_id: int) -> tuple[Reservation, bool]:
    """Client cancels their reservation; returns ``(reservation, refunded)`` (PLAN 8.2).

    Refund policy (AD-5): an unpaid hold simply lapses (no refund); a paid booking is
    refunded, except a ``confirmed`` one cancelled within ``FREE_CANCELLATION_HOURS`` of
    the start — then the host keeps the revenue and ``refunded`` is ``False``.

    Raises:
        InvalidStateTransition: when the reservation is already finished/cancelled.
    """
    reservation = _lock_reservation(reservation_id=reservation_id, client=client)
    refunded = _should_refund_on_cancel(reservation=reservation)
    transition(reservation=reservation, target=_Status.CANCELLED)
    if refunded:
        _refund_if_paid(reservation=reservation)
    _notify(
        "reservation_cancelled",
        to=reservation.garden.host.email,
        user=reservation.garden.host,
        reservation=reservation,
        extra={"refunded": refunded},
    )
    return reservation, refunded


def _should_refund_on_cancel(*, reservation: Reservation, now: datetime | None = None) -> bool:
    if reservation.status == _Status.PENDING_PAYMENT:
        return False  # nothing was charged yet
    if reservation.status == _Status.AWAITING_HOST:
        return True  # paid, host had not decided
    if reservation.status == _Status.CONFIRMED:
        now = now or timezone.now()
        free_until = reservation.start_time - timedelta(hours=settings.FREE_CANCELLATION_HOURS)
        return now <= free_until
    return False


# --- expiry (AD-11, lazy) -------------------------------------------------------------


@transaction.atomic
def expire_pending_reservations(*, now: datetime | None = None) -> int:
    """Cancel unpaid holds whose payment window has elapsed; return the count (AD-11).

    The slot map does not depend on this running — ``busy_intervals`` already ignores
    expired holds — but it keeps the data tidy. Invoked by ``cleanup_expired_reservations``.
    """
    now = now or timezone.now()
    stale = Reservation.objects.select_for_update().filter(
        status=_Status.PENDING_PAYMENT, expires_at__lte=now
    )
    count = 0
    for reservation in stale:
        transition(reservation=reservation, target=_Status.CANCELLED, when=now)
        count += 1
    return count


# --- helpers --------------------------------------------------------------------------


def _lock_reservation(*, reservation_id: int, **ownership) -> Reservation:
    """Lock and return a reservation owned per ``ownership`` (e.g. ``client=user``).

    The lock holds for the surrounding transaction so the state change is race-free. A
    miss means the actor does not own the reservation → 404 (privacy, PLAN 11).
    """
    try:
        return (
            Reservation.objects.select_for_update()
            .select_related("client", "garden", "garden__host")
            .get(id=reservation_id, **ownership)
        )
    except Reservation.DoesNotExist as exc:
        raise NotFound("Nie znaleziono rezerwacji.") from exc


def _notify(
    template_key: str,
    *,
    to: str,
    user: User,
    reservation: Reservation,
    extra: dict | None = None,
) -> None:
    """Send a reservation e-mail through the notifications facade (B10 context contract).

    Recipient is passed as ``user`` and the domain object as ``reservation`` / ``garden``;
    templates duck-type the fields and format money/dates themselves (PLAN 10.2 / README).
    """
    context = {"user": user, "reservation": reservation, "garden": reservation.garden}
    if extra:
        context.update(extra)
    notifications.send(template_key, to=to, context=context)


def _refund_if_paid(*, reservation: Reservation) -> None:
    """Refund through the payments facade when present (B5); a no-op until then.

    The payments app owns the gateway (PLAN 17.3). In B4 nothing is really charged, so the
    facade being absent is the correct no-op; B5 supplies ``refund_if_paid``.
    """
    try:
        from apps.payments import services as payment_services
    except ImportError:
        return
    payment_services.refund_if_paid(reservation=reservation)
