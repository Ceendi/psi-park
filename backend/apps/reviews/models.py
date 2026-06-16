"""The review model — a client's rating + comment for a completed stay (PLAN 7.7, K-1).

Eligibility (an owned ``confirmed`` reservation whose ``end_time`` has passed, not yet
reviewed) is a business rule enforced in ``reviews.services``; the model only stores the
data and the two hard backstops: one review per ``(author, garden)`` pair and a 1–5 rating.
The reservation is the proof of eligibility, so it is a ``OneToOne`` (one review per stay).
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel

RATING_MIN = 1
RATING_MAX = 5


class Review(TimeStampedModel):
    """A 1–5 rating with an optional comment, left by a client for a garden (PLAN 7.7).

    ``UniqueConstraint(author, garden)`` (K-1) caps a client at one review per garden — the
    service does the friendly pre-check, this constraint is the race-free backstop. Every
    foreign key cascades (PLAN 7.7): a deleted reservation/garden takes its review with it.
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
    )
    garden = models.ForeignKey(
        "gardens.Garden",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    reservation = models.OneToOneField(
        "reservations.Reservation",
        on_delete=models.CASCADE,
        related_name="review",
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["author", "garden"], name="review_unique_author_garden"
            ),
            # Literal bounds: RATING_MIN/MAX are out of scope inside the nested Meta class.
            models.CheckConstraint(
                name="review_rating_between_1_and_5",
                condition=models.Q(rating__gte=1, rating__lte=5),
            ),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} garden={self.garden_id} {self.rating}★"
