"""The ``Payment`` model — one Stripe PaymentIntent per reservation (PLAN 7.5, K-3).

A payment mirrors the canonical state held by Stripe; the webhook is the source of truth
for ``succeeded``/``refunded`` (PLAN 10.1), never the browser. Billing fields capture the
"Dane do rozliczenia" step of the checkout so the invoice (B6) can be issued to the right
buyer. Money is ``Decimal`` in PLN; the conversion to grosze happens only at the Stripe
boundary in ``gateway.py`` (AD-16).
"""

from django.db import models

from apps.core.models import TimeStampedModel


class Payment(TimeStampedModel):
    """A card payment for a single reservation via Stripe PaymentIntent (PLAN 7.5)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Oczekuje"
        SUCCEEDED = "succeeded", "Opłacona"
        FAILED = "failed", "Nieudana"
        REFUNDED = "refunded", "Zwrócona"

    reservation = models.OneToOneField(
        "reservations.Reservation",
        on_delete=models.CASCADE,
        related_name="payment",
    )
    stripe_payment_intent_id = models.CharField(max_length=120, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=3, default="pln")
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    # Billing details captured at checkout ("Dane do rozliczenia"); feed the invoice (B6).
    billing_name = models.CharField(max_length=120, blank=True)
    billing_email = models.EmailField(blank=True)
    billing_address = models.CharField(max_length=200, blank=True)
    billing_postal_code = models.CharField(max_length=12, blank=True)
    billing_city = models.CharField(max_length=80, blank=True)
    billing_country = models.CharField(max_length=2, default="PL")
    billing_company = models.CharField(max_length=160, blank=True)
    tax_id = models.CharField(max_length=15, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Payment #{self.pk} reservation={self.reservation_id} {self.status}"
