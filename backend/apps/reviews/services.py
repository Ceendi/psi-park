"""Review write operations (PLAN 5.1, 6.2, 15-B7).

Views validate the input shape with a serializer and then call exactly one of these
functions (keyword-only args, PLAN 6.2). ``create_review`` owns the eligibility rule
(PLAN 7.7): the author must own a ``confirmed`` reservation in the garden whose ``end_time``
has passed and which has not been reviewed yet. ``update_review``/``delete_review`` act on a
review the caller already owns (the view scopes it through ``selectors.owned_reviews``).
"""

from datetime import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.core.exceptions import ReviewAlreadyExists, ReviewNotEligible
from apps.reservations.models import Reservation
from apps.reviews.models import Review

_Status = Reservation.Status


@transaction.atomic
def create_review(*, client: User, reservation_id: int, rating: int, comment: str = "") -> Review:
    """Create the review for the client's completed ``reservation_id`` stay.

    The reservation row is locked (``select_for_update``) so a double submit cannot create
    two reviews for the same stay; the ``(author, garden)`` uniqueness is the second backstop.

    Raises:
        NotFound: the reservation does not exist or is not the caller's (privacy, PLAN 11).
        ReviewNotEligible: the stay is not a finished (``confirmed`` + past) reservation.
        ReviewAlreadyExists: the client has already reviewed this garden.
    """
    reservation = _get_owned_reservation(client=client, reservation_id=reservation_id)
    if not _is_completed(reservation):
        raise ReviewNotEligible()
    if Review.objects.filter(author=client, garden=reservation.garden_id).exists():
        raise ReviewAlreadyExists()
    return Review.objects.create(
        author=client,
        garden=reservation.garden,
        reservation=reservation,
        rating=rating,
        comment=comment,
    )


def update_review(*, review: Review, data: dict) -> Review:
    """Apply a partial update (``rating`` and/or ``comment``) to an owned review."""
    fields = [field for field in ("rating", "comment") if field in data]
    for field in fields:
        setattr(review, field, data[field])
    if fields:
        review.save(update_fields=[*fields, "updated_at"])
    return review


def delete_review(*, review: Review) -> None:
    """Delete an owned review (the garden's rating aggregate updates on the next read)."""
    review.delete()


def _get_owned_reservation(*, client: User, reservation_id: int) -> Reservation:
    """Lock and return the client's own reservation, or 404 (privacy, PLAN 11)."""
    try:
        return (
            Reservation.objects.select_for_update()
            .select_related("garden")
            .get(id=reservation_id, client=client)
        )
    except Reservation.DoesNotExist as exc:
        raise NotFound("Nie znaleziono rezerwacji.") from exc


def _is_completed(reservation: Reservation, *, now: datetime | None = None) -> bool:
    """True for a finished stay: a ``confirmed`` reservation whose ``end_time`` has passed."""
    now = now or timezone.now()
    return reservation.status == _Status.CONFIRMED and reservation.end_time < now
