"""Read-side queries for reviews (PLAN 5.1, 6.2, 15-B7).

The public garden-review list joins its author so the catalogue card needs no extra query;
``eligible_reservations`` is what the client panel reads to render the "review this stay"
CTA. The garden rating aggregates are *not* here — they are annotated by ``gardens.selectors``
straight off the ``reviews`` reverse relation (PLAN 15-B7, no denormalisation).
"""

from datetime import datetime

from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.accounts.models import User
from apps.gardens.models import GardenPhoto
from apps.reservations.models import Reservation
from apps.reviews.models import Review

# Cover photo for the nested garden card on the eligible list (index 0 is the cover).
_PHOTOS_PREFETCH = Prefetch(
    "garden__photos", queryset=GardenPhoto.objects.order_by("position", "id")
)


def garden_reviews(*, garden_id: int) -> QuerySet[Review]:
    """A garden's reviews, newest first, with the author joined (public, PLAN 8.2)."""
    return Review.objects.filter(garden_id=garden_id).select_related("author")


def review_detail_qs() -> QuerySet[Review]:
    """A single review ready for serialization — author/garden/reservation joined."""
    return Review.objects.select_related("author", "garden", "reservation")


def owned_reviews(*, author: User) -> QuerySet[Review]:
    """Reviews written by ``author`` (scopes PATCH/DELETE so a foreign id is a 404)."""
    return review_detail_qs().filter(author=author)


def eligible_reservations(*, client: User, now: datetime | None = None) -> QuerySet[Reservation]:
    """The client's completed stays still awaiting a review (PLAN 8.2, the CTA feed).

    A reservation qualifies when it is ``confirmed``, its ``end_time`` has passed, and the
    client has not already reviewed that garden (one review per garden — K-1). Gardens the
    client already reviewed are excluded, so every row here can actually be reviewed.
    """
    now = now or timezone.now()
    already_reviewed = Review.objects.filter(author=client).values("garden_id")
    return (
        Reservation.objects.filter(
            client=client,
            status=Reservation.Status.CONFIRMED,
            end_time__lt=now,
        )
        .exclude(garden_id__in=already_reviewed)
        .select_related("garden")
        .prefetch_related(_PHOTOS_PREFETCH)
        .order_by("-end_time", "-id")
    )
