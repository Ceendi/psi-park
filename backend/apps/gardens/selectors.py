"""Read-side queries for gardens (PLAN 5.1, 6.2, 15-B3).

Every queryset that feeds a serializer is built here with ``select_related`` /
``prefetch_related`` / ``annotate`` so list and detail stay inside their query budgets
(PLAN 12). Two cross-part seams are crossed lazily so B3 can ship before its dependents:

* **Ratings** come from the ``reviews`` reverse relation (B7). Until that app is
  installed the relation is absent, so the aggregates degrade to ``None`` / ``0``.
* **Availability** delegates collision data to ``reservations.selectors.busy_intervals``
  (B4 owns the collision rule, PLAN 7.4.2). Until B4 ships every slot reads as free.
"""

from datetime import date as date_cls
from datetime import datetime, time, timedelta

from django.db.models import Avg, Count, FloatField, IntegerField, Prefetch, QuerySet, Value
from django.utils import timezone

from apps.accounts.models import User
from apps.gardens.models import Garden, GardenPhoto

_PHOTOS_PREFETCH = Prefetch("photos", queryset=GardenPhoto.objects.order_by("position", "id"))


def _reviews_relation_installed() -> bool:
    """True once the reviews app (B7) wires a ``reviews`` reverse relation onto Garden."""
    return any(rel.get_accessor_name() == "reviews" for rel in Garden._meta.related_objects)


def _with_ratings(queryset: QuerySet[Garden]) -> QuerySet[Garden]:
    """Annotate ``rating_avg`` / ``rating_count``; constant fallbacks until B7 exists."""
    if _reviews_relation_installed():
        return queryset.annotate(
            rating_avg=Avg("reviews__rating"),
            rating_count=Count("reviews", distinct=True),
        )
    return queryset.annotate(
        rating_avg=Value(None, output_field=FloatField()),
        rating_count=Value(0, output_field=IntegerField()),
    )


def _base_queryset() -> QuerySet[Garden]:
    """Garden rows ready for serialization: host joined, photos prefetched, ratings annotated."""
    return _with_ratings(Garden.objects.select_related("host").prefetch_related(_PHOTOS_PREFETCH))


def public_garden_list() -> QuerySet[Garden]:
    """Approved + active gardens for the public catalogue (PLAN 8.2); filters layer on top."""
    return _base_queryset().filter(verification_status=Garden.Verification.APPROVED, is_active=True)


def visible_gardens(*, user) -> QuerySet[Garden]:
    """Gardens a given requester may open by id (PLAN 8.2 visibility rule).

    Public sees approved + active only; an admin sees everything; a host additionally
    sees their own gardens in any status (so they can preview a pending listing).
    """
    queryset = _base_queryset()
    if user and user.is_authenticated:
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.HOST:
            from django.db.models import Q

            return queryset.filter(
                Q(verification_status=Garden.Verification.APPROVED, is_active=True) | Q(host=user)
            )
    return queryset.filter(verification_status=Garden.Verification.APPROVED, is_active=True)


def host_gardens(*, host: User) -> QuerySet[Garden]:
    """All of a host's gardens, every status (their dashboard list, PLAN 8.2)."""
    return _base_queryset().filter(host=host)


def _busy_intervals(
    *, garden: Garden, start: datetime, end: datetime
) -> list[tuple[datetime, datetime]]:
    """Busy ``[start, end)`` intervals for the day, delegated to the reservations app.

    The reservations app (B4) owns the collision rule (PLAN 7.4.2 / 15-B3), exposing
    ``busy_intervals(*, garden, date_range=(start, end))``. Until it is installed the
    import fails and the garden reads as fully free.
    """
    try:
        from apps.reservations import selectors as reservation_selectors
    except ImportError:
        return []
    return list(reservation_selectors.busy_intervals(garden=garden, date_range=(start, end)))


def availability(*, garden: Garden, day: date_cls) -> dict:
    """Hourly availability map for ``day`` (PLAN 8.2 / 8.3).

    Slots are whole clock hours fully inside the garden's opening window; a slot is
    unavailable when it overlaps a busy interval from the reservations app.
    """
    open_from, open_to = garden.open_from, garden.open_to
    tz = timezone.get_current_timezone()
    window_start = timezone.make_aware(datetime.combine(day, open_from), tz)
    window_end = timezone.make_aware(datetime.combine(day, open_to), tz)
    busy = _busy_intervals(garden=garden, start=window_start, end=window_end)

    # First slot starts on the next whole hour at/after opening; last ends at/before close.
    start_hour = open_from.hour + (1 if open_from.minute else 0)
    slots = []
    for hour in range(start_hour, open_to.hour):
        slot_start = timezone.make_aware(datetime.combine(day, time(hour=hour)), tz)
        slot_end = slot_start + timedelta(hours=1)
        available = not any(b_start < slot_end and slot_start < b_end for b_start, b_end in busy)
        slots.append({"hour": slot_start.strftime("%H:%M"), "available": available})

    return {"date": day, "open_from": open_from, "open_to": open_to, "slots": slots}
