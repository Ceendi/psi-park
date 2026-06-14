"""Tests for the Stripe gateway facade (PLAN 15-B5, 10.1).

No network and no database: the Stripe SDK is patched. These pin the money-to-grosze
conversion (AD-16) and the signature-error wrapping the webhook view relies on.
"""

from decimal import Decimal
from unittest.mock import Mock, patch

import pytest

from apps.payments import gateway


def test_create_payment_intent_converts_pln_to_grosze():
    fake_intent = Mock(id="pi_1", client_secret="cs_1")
    with patch(
        "apps.payments.gateway.stripe.PaymentIntent.create", return_value=fake_intent
    ) as create:
        intent_id, secret = gateway.create_payment_intent(
            amount_pln=Decimal("99.00"), metadata={"reservation_id": "5"}
        )

    assert (intent_id, secret) == ("pi_1", "cs_1")
    kwargs = create.call_args.kwargs
    assert kwargs["amount"] == 9900  # integer grosze, never float
    assert kwargs["currency"] == "pln"
    assert kwargs["payment_method_types"] == ["card"]


def test_create_payment_intent_rounds_down_to_whole_grosz():
    fake_intent = Mock(id="pi_2", client_secret="cs_2")
    with patch(
        "apps.payments.gateway.stripe.PaymentIntent.create", return_value=fake_intent
    ) as create:
        gateway.create_payment_intent(amount_pln=Decimal("123.45"), metadata={})

    assert create.call_args.kwargs["amount"] == 12345


def test_refund_calls_stripe_with_intent_id():
    with patch("apps.payments.gateway.stripe.Refund.create") as refund:
        gateway.refund(intent_id="pi_9")
    refund.assert_called_once_with(payment_intent="pi_9")


def test_construct_event_returns_verified_event():
    event = {"type": "payment_intent.succeeded"}
    with patch(
        "apps.payments.gateway.stripe.Webhook.construct_event", return_value=event
    ) as construct:
        result = gateway.construct_event(payload=b"{}", sig_header="sig")

    assert result == event
    construct.assert_called_once()


def test_construct_event_wraps_bad_payload_as_signature_error():
    with (
        patch(
            "apps.payments.gateway.stripe.Webhook.construct_event",
            side_effect=ValueError("bad payload"),
        ),
        pytest.raises(gateway.WebhookSignatureError),
    ):
        gateway.construct_event(payload=b"not-json", sig_header="sig")
