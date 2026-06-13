"""Read-side queries for reservations (PLAN 5.1, 6.2, 15-B4).

This app owns the collision rule (PLAN 7.4.2): ``busy_intervals`` is the contract that
``gardens.selectors.availability`` calls (lazily, to avoid an import cycle — PLAN 17.3)
to mark slots unavailable. All list querysets join everything a serializer needs so the
endpoints stay inside their query budgets (PLAN 12: reservation list ≤ 6).
"""

from datetime import datetime
from decimal import Decimal

from django.db.models import Avg, Prefetch, Q, QuerySet, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.gardens.models import Garden, GardenPhoto
from apps.reservations.models import Reservation

_Status = Reservation.Status

# Cover photo for the nested garden card (ordered so index 0 is the cover).
_PHOTOS_PREFETCH = Prefetch(
    "garden__photos", queryset=GardenPhoto.objects.order_by("position", "id")
)

# Client panel tabs (PLAN 8.2 ``status_group``) and host panel tabs.
CLIENT_STATUS_GROUPS = ("upcoming", "completed", "cancelled")
HOST_STATUS_GROUPS = ("pending", "accepted", "completed", "cancelled")


def _display_qs() -> QuerySet[Reservation]:
    """Reservations ready for serialization: garden (+host+cover), dog and client joined."""
    return Reservation.objects.select_related(
        "garden", "garden__host", "dog", "client"
    ).prefetch_related(_PHOTOS_PREFETCH)


def _active_overlap_qs(
    *, garden_id: int, start: datetime, end: datetime, now: datetime
) -> QuerySet[Reservation]:
    """Reservations of a garden that hold the ``[start, end)`` window (PLAN 7.4.2).

    A window is held by a committed reservation (``awaiting_host``/``confirmed``) or by a
    not-yet-expired unpaid hold (``pending_payment`` with ``expires_at > now``). Expired
    holds are ignored, so a slot frees up at TTL without a cleanup pass (AD-11).
    """
    return Reservation.objects.filter(
        garden_id=garden_id, start_time__lt=end, end_time__gt=start
    ).filter(
        Q(status__in=Reservation.BLOCKING_STATUSES)
        | Q(status=_Status.PENDING_PAYMENT, expires_at__gt=now)
    )


def busy_intervals(
    *, garden: Garden, date_range: tuple[datetime, datetime]
) -> list[tuple[datetime, datetime]]:
    """Busy ``(start, end)`` intervals of ``garden`` within ``date_range`` (the B3 seam).

    This is the contract ``gardens.selectors.availability`` depends on; the signature is
    fixed (PLAN 15-B3). Returns timezone-aware datetimes.
    """
    start, end = date_range
    rows = _active_overlap_qs(
        garden_id=garden.id, start=start, end=end, now=timezone.now()
    ).values_list("start_time", "end_time")
    return list(rows)


def has_collision(*, garden_id: int, start_time: datetime, end_time: datetime) -> bool:
    """True when a new ``[start_time, end_time)`` booking would overlap a held window."""
    return _active_overlap_qs(
        garden_id=garden_id, start=start_time, end=end_time, now=timezone.now()
    ).exists()


def client_reservations(
    *, client: User, status_group: str | None = None, now: datetime | None = None
) -> QuerySet[Reservation]:
    """A client's own reservations, optionally narrowed to a panel tab (PLAN 8.2)."""
    now = now or timezone.now()
    qs = _display_qs().filter(client=client)
    if status_group == "upcoming":
        return qs.filter(
            status__in=[_Status.PENDING_PAYMENT, _Status.AWAITING_HOST, _Status.CONFIRMED],
            end_time__gte=now,
        )
    if status_group == "completed":
        return qs.filter(status=_Status.CONFIRMED, end_time__lt=now)
    if status_group == "cancelled":
        return qs.filter(status__in=[_Status.CANCELLED, _Status.REJECTED])
    return qs


def host_reservations(
    *,
    host: User,
    status_group: str | None = None,
    garden_id: int | None = None,
    now: datetime | None = None,
) -> QuerySet[Reservation]:
    """Reservations on a host's gardens (PLAN 8.2).

    Only reservations that were paid (``paid_at`` set) are surfaced — the host has no
    business seeing a client's abandoned, never-paid checkout attempt.
    """
    now = now or timezone.now()
    qs = _display_qs().filter(garden__host=host, paid_at__isnull=False)
    if garden_id is not None:
        qs = qs.filter(garden_id=garden_id)
    if status_group == "pending":
        return qs.filter(status=_Status.AWAITING_HOST)
    if status_group == "accepted":
        return qs.filter(status=_Status.CONFIRMED, end_time__gte=now)
    if status_group == "completed":
        return qs.filter(status=_Status.CONFIRMED, end_time__lt=now)
    if status_group == "cancelled":
        return qs.filter(status__in=[_Status.CANCELLED, _Status.REJECTED])
    return qs


def participant_reservations(*, user: User) -> QuerySet[Reservation]:
    """Reservations the user takes part in — as the client or as the garden's host.

    Backs ``GET /reservations/{id}/``: a foreign id resolves to 404 (privacy, PLAN 11).
    """
    return _display_qs().filter(Q(client=user) | Q(garden__host=user))


def host_schedule(
    *,
    host: User,
    start: datetime,
    end: datetime,
    garden_id: int | None = None,
) -> QuerySet[Reservation]:
    """Calendar events for a host's schedule in ``[start, end)`` (PLAN 8.2).

    Only committed reservations (``awaiting_host``/``confirmed``) occupy the calendar.
    """
    qs = Reservation.objects.select_related("garden", "dog", "client").filter(
        garden__host=host,
        status__in=Reservation.BLOCKING_STATUSES,
        start_time__lt=end,
        end_time__gt=start,
    )
    if garden_id is not None:
        qs = qs.filter(garden_id=garden_id)
    return qs.order_by("start_time")


def _reviews_relation_installed() -> bool:
    """True once the reviews app (B7) wires a ``reviews`` reverse relation onto Garden."""
    return any(rel.get_accessor_name() == "reviews" for rel in Garden._meta.related_objects)


def _host_rating_avg(*, host: User) -> float | None:
    """Average review score across a host's gardens; ``None`` until the reviews app (B7)."""
    if not _reviews_relation_installed():
        return None
    value = Garden.objects.filter(host=host).aggregate(value=Avg("reviews__rating"))["value"]
    return round(float(value), 1) if value is not None else None


def host_stats(*, host: User, now: datetime | None = None) -> dict:
    """Dashboard tiles for a host: counts, booked earnings and average rating (PLAN 8.2).

    ``total_earnings`` is the host's cut (``subtotal``, i.e. excluding the platform fee)
    over confirmed reservations. ``rating_avg`` degrades to ``None`` until B7 ships.
    """
    now = now or timezone.now()
    base = Reservation.objects.filter(garden__host=host)
    confirmed = base.filter(status=_Status.CONFIRMED)
    return {
        "pending_count": base.filter(status=_Status.AWAITING_HOST).count(),
        "upcoming_count": confirmed.filter(end_time__gte=now).count(),
        "completed_count": confirmed.filter(end_time__lt=now).count(),
        "total_earnings": confirmed.aggregate(total=Sum("subtotal"))["total"] or Decimal("0.00"),
        "rating_avg": _host_rating_avg(host=host),
    }
