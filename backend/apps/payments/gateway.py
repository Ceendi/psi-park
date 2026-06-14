"""Stripe gateway — the only module that imports ``stripe`` (PLAN 6.1 DIP, 10.1, B5).

Everything above this layer (``services.py``, views) talks PLN ``Decimal`` and plain dicts;
this facade is the single place that knows about Stripe SDK types, the grosze conversion
(AD-16: ``int(Decimal * 100)``) and the ``pln`` currency. Keeping the import confined here
means the rest of the app — and the whole test suite — can run with Stripe fully mocked,
and a different processor could be swapped in without touching callers.
"""

from decimal import Decimal

import stripe
from django.conf import settings

CURRENCY = "pln"


class WebhookSignatureError(Exception):
    """Raised when a webhook payload fails Stripe signature verification.

    Wraps Stripe's ``SignatureVerificationError``/``ValueError`` so callers (the webhook
    view) can react without importing ``stripe`` themselves (keeps the SDK confined here).
    """


def _amount_in_grosze(amount_pln: Decimal) -> int:
    """Convert a PLN ``Decimal`` to integer grosze for Stripe (AD-16, never float)."""
    return int(amount_pln * 100)


def create_payment_intent(
    *, amount_pln: Decimal, metadata: dict, idempotency_key: str | None = None
) -> tuple[str, str]:
    """Create (or, with an idempotency key, re-fetch) a card PaymentIntent.

    Cards only — BLIK/Przelewy24/wallets were dropped by the owner (PLAN 16.1.1), so the
    intent is pinned to ``card`` and never needs a redirect. Passing a stable
    ``idempotency_key`` makes a repeated call for the same reservation return the *same*
    intent and ``client_secret`` instead of creating a duplicate (PLAN B5: idempotent).

    Returns:
        ``(payment_intent_id, client_secret)``.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY
    intent = stripe.PaymentIntent.create(
        amount=_amount_in_grosze(amount_pln),
        currency=CURRENCY,
        payment_method_types=["card"],
        metadata=metadata,
        idempotency_key=idempotency_key,
    )
    return intent.id, intent.client_secret


def refund(*, intent_id: str) -> None:
    """Refund a succeeded PaymentIntent in full (host rejection / client cancellation)."""
    stripe.api_key = settings.STRIPE_SECRET_KEY
    stripe.Refund.create(payment_intent=intent_id)


def construct_event(*, payload: bytes, sig_header: str):
    """Verify a webhook's Stripe signature and return the parsed event.

    Raises:
        WebhookSignatureError: when the payload is malformed or the signature is invalid.
    """
    try:
        return stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise WebhookSignatureError(str(exc)) from exc
