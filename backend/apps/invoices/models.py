"""Invoice models — the accounting document issued for a paid reservation (PLAN 7.6, K-8).

An ``Invoice`` is created exactly once, when the payment webhook reports ``succeeded``
(PLAN 10.3), and is never mutated afterwards — it is an immutable accounting record, so the
reservation it points at is ``PROTECT``-ed and the GDPR account deletion keeps it (PLAN 11).
``InvoiceSequence`` is the per-month counter behind the ``PSI/RRRR/MM/NNNN`` numbering; it is
incremented under ``select_for_update`` so concurrent issues can never collide (PLAN 7.6).
"""

from django.db import models

from apps.core.models import TimeStampedModel


class Invoice(TimeStampedModel):
    """A VAT-exempt invoice for one reservation (PLAN 7.6).

    ``number`` is the human-facing unique identifier; ``total_gross`` snapshots the amount
    at issue time so a later price change never rewrites a settled document. The rendered
    PDF lives on the media volume and is served only through the owner-scoped API endpoint.
    """

    reservation = models.OneToOneField(
        "reservations.Reservation",
        on_delete=models.PROTECT,
        related_name="invoice",
    )
    number = models.CharField(max_length=20, unique=True)
    pdf = models.FileField(upload_to="invoices/%Y/%m/")
    issued_at = models.DateTimeField()
    total_gross = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self) -> str:
        return self.number


class InvoiceSequence(TimeStampedModel):
    """Per-month invoice counter; ``last_number`` is the highest ``NNNN`` issued (PLAN 7.6).

    One row per ``(year, month)``. The number is allocated by locking the row
    (``select_for_update``) and bumping ``last_number``, which serialises concurrent
    issuers and guarantees a gap-free, race-free sequence within the month.
    """

    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-year", "-month"]
        constraints = [
            models.UniqueConstraint(fields=["year", "month"], name="invoice_sequence_year_month"),
        ]

    def __str__(self) -> str:
        return f"{self.year:04d}/{self.month:02d} → {self.last_number}"
