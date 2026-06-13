from django.conf import settings
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import (
    DateTimeRangeField,
    RangeBoundary,
    RangeOperators,
)
from django.db import models
from django.db.models import F, Func, Q
from django.utils import timezone

from apps.core.models import TimeStampedModel


class TsTzRange(Func):
    """Build a Postgres ``tstzrange(start, end, '[)')`` from two timestamp columns.

    Used only by the exclusion constraint below so the database can reject overlapping
    reservation windows (PLAN 7.4.2). The ``[)`` bound makes touching windows
    (``end == next start``) legal, matching the half-open ``[start, end)`` slot model.
    """

    function = "TSTZRANGE"
    output_field = DateTimeRangeField()


class Reservation(TimeStampedModel):
    """A client's booking of a garden for a whole-hour window (PLAN 7.4).

    The status field drives a small state machine (PLAN 7.4.1) enforced by
    ``reservations.services.transition`` — the model only stores the state and the audit
    timestamps. Prices are snapshotted at creation so a later price-list change never
    rewrites booking history (PLAN K-7).
    """

    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Oczekuje na płatność"
        AWAITING_HOST = "awaiting_host", "Oczekuje na decyzję gospodarza"
        CONFIRMED = "confirmed", "Potwierdzona"
        REJECTED = "rejected", "Odrzucona"
        CANCELLED = "cancelled", "Anulowana"

    # Committed statuses that hold a slot regardless of the clock — the immutable part of
    # the anti-collision rule, backed by the database exclusion constraint below. A
    # PENDING_PAYMENT hold is time-bounded (``expires_at``) so it is enforced in the
    # service layer instead (PLAN 7.4.2 / see selectors._active_overlap_qs).
    BLOCKING_STATUSES = (Status.AWAITING_HOST, Status.CONFIRMED)

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    garden = models.ForeignKey(
        "gardens.Garden",
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    dog = models.ForeignKey(
        "dogs.Dog",
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    dogs_count = models.PositiveSmallIntegerField(default=1)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        db_index=True,
    )
    price_per_hour_snapshot = models.DecimalField(max_digits=7, decimal_places=2)
    subtotal = models.DecimalField(max_digits=8, decimal_places=2)
    service_fee = models.DecimalField(max_digits=8, decimal_places=2)
    total_price = models.DecimalField(max_digits=8, decimal_places=2)
    message_to_host = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-start_time"]
        indexes = [
            # Backs the overlap/collision lookups and the host schedule (PLAN 12).
            models.Index(fields=["garden", "start_time"], name="reservation_garden_start_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                name="reservation_end_after_start",
                condition=Q(end_time__gt=F("start_time")),
            ),
            # Hard backstop for the collision rule (PLAN 7.4.2): no two committed
            # reservations of the same garden may have overlapping windows. Requires the
            # btree_gist extension, installed by this app's initial migration.
            ExclusionConstraint(
                name="reservation_no_overlap",
                expressions=[
                    ("garden", RangeOperators.EQUAL),
                    (
                        TsTzRange(F("start_time"), F("end_time"), RangeBoundary()),
                        RangeOperators.OVERLAPS,
                    ),
                ],
                # Literal values: the nested ``Status`` enum is out of scope inside Meta.
                condition=Q(status__in=["awaiting_host", "confirmed"]),
            ),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} garden={self.garden_id} {self.start_time:%Y-%m-%d %H:%M}"

    @property
    def is_expired(self) -> bool:
        """True for an unpaid hold whose payment window has elapsed (AD-11, lazy expiry)."""
        return (
            self.status == self.Status.PENDING_PAYMENT
            and self.expires_at is not None
            and self.expires_at <= timezone.now()
        )
