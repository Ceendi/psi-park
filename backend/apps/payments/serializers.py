"""Serializers for the payments API (PLAN 6.1 ISP, 8.2).

``BillingSerializer`` validates the "Dane do rozliczenia" block submitted with the
payment-intent request; the response serializers document the (Stripe-facing) shapes the
frontend consumes. The card itself never touches our backend — only Stripe's
``client_secret`` does (PLAN AD-4).
"""

from rest_framework import serializers


class BillingSerializer(serializers.Serializer):
    """Billing details for the invoice buyer (PLAN 7.5 / Payment.html).

    The core address block is required (it bills the invoice, B6); company name and NIP
    are the optional "faktura na firmę" extension. ``billing_country`` defaults to PL.
    """

    billing_name = serializers.CharField(max_length=120)
    billing_email = serializers.EmailField()
    billing_address = serializers.CharField(max_length=200)
    billing_postal_code = serializers.CharField(max_length=12)
    billing_city = serializers.CharField(max_length=80)
    billing_country = serializers.CharField(max_length=2, required=False, default="PL")
    billing_company = serializers.CharField(
        max_length=160, required=False, allow_blank=True, default=""
    )
    tax_id = serializers.CharField(max_length=15, required=False, allow_blank=True, default="")


class PaymentIntentResponseSerializer(serializers.Serializer):
    """Payload returned to the frontend to mount the Stripe Payment Element (PLAN 10.1)."""

    client_secret = serializers.CharField()
    payment_intent_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    currency = serializers.CharField()
    status = serializers.CharField()
    publishable_key = serializers.CharField()


class StripeConfigSerializer(serializers.Serializer):
    """Public Stripe configuration for the frontend (``GET /payments/config/``)."""

    publishable_key = serializers.CharField()
