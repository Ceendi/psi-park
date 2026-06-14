"""API contract tests for payments (PLAN 8.2 Płatności).

Stripe is mocked at the gateway. Covered: the public config key; payment-intent happy
path and the full auth matrix (401/403/404) plus the 409/410 state guards; and the
webhook (bad signature → 400, a verified event is processed, unknown types acknowledged).
"""

from datetime import timedelta
from unittest.mock import Mock

import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time

from apps.payments import gateway
from apps.payments.models import Payment
from apps.payments.tests.factories import PaymentFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status

CONFIG_URL = reverse("payment-config")
WEBHOOK_URL = reverse("payment-webhook")


def _intent_url(pk):
    return reverse("payment-intent", args=[pk])


def _patch_intent(monkeypatch, intent_id="pi_api", secret="pi_api_secret"):
    monkeypatch.setattr(gateway, "create_payment_intent", Mock(return_value=(intent_id, secret)))


# --- config ---------------------------------------------------------------------------


def test_config_returns_publishable_key(api_client, settings):
    settings.STRIPE_PUBLISHABLE_KEY = "pk_test_abc"
    response = api_client.get(CONFIG_URL)
    assert response.status_code == 200
    assert response.json() == {"publishable_key": "pk_test_abc"}


# --- payment-intent: happy + auth matrix ----------------------------------------------


def test_payment_intent_returns_client_secret(
    auth_client, reservation, billing_payload, monkeypatch
):
    client, _ = auth_client
    _patch_intent(monkeypatch)

    response = client.post(_intent_url(reservation.id), billing_payload, format="json")

    assert response.status_code == 200
    body = response.json()
    assert body["client_secret"] == "pi_api_secret"
    assert body["payment_intent_id"] == "pi_api"
    payment = Payment.objects.get(reservation=reservation)
    assert payment.status == Payment.Status.PENDING
    assert payment.billing_city == "Kraków"


def test_payment_intent_requires_auth(api_client, reservation, billing_payload):
    response = api_client.post(_intent_url(reservation.id), billing_payload, format="json")
    assert response.status_code == 401


def test_payment_intent_forbidden_for_host(api_client, host_user, reservation, billing_payload):
    api_client.force_authenticate(user=host_user)
    response = api_client.post(_intent_url(reservation.id), billing_payload, format="json")
    assert response.status_code == 403


def test_payment_intent_foreign_reservation_returns_404(
    api_client, other_client, reservation, billing_payload
):
    api_client.force_authenticate(user=other_client)
    response = api_client.post(_intent_url(reservation.id), billing_payload, format="json")
    assert response.status_code == 404


def test_payment_intent_validates_billing(auth_client, reservation, monkeypatch):
    client, _ = auth_client
    _patch_intent(monkeypatch)
    response = client.post(_intent_url(reservation.id), {"billing_name": "X"}, format="json")
    assert response.status_code == 400
    assert "billing_email" in response.json()


# --- payment-intent: state guards -----------------------------------------------------


def test_payment_intent_conflict_when_already_paid(auth_client, billing_payload, monkeypatch):
    client, client_user = auth_client
    _patch_intent(monkeypatch)
    reservation = ReservationFactory(
        client=client_user, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    response = client.post(_intent_url(reservation.id), billing_payload, format="json")
    assert response.status_code == 409
    assert response.json()["code"] == "payment_already_processed"


def test_payment_intent_gone_when_expired(auth_client, billing_payload, monkeypatch):
    client, client_user = auth_client
    _patch_intent(monkeypatch)
    with freeze_time("2026-06-15 12:00:00"):
        reservation = ReservationFactory(
            client=client_user,
            status=_Status.PENDING_PAYMENT,
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        response = client.post(_intent_url(reservation.id), billing_payload, format="json")
    assert response.status_code == 410
    assert response.json()["code"] == "reservation_expired"


# --- webhook --------------------------------------------------------------------------


def test_webhook_bad_signature_returns_400(api_client, monkeypatch):
    monkeypatch.setattr(
        gateway, "construct_event", Mock(side_effect=gateway.WebhookSignatureError("bad"))
    )
    response = api_client.post(
        WEBHOOK_URL, data=b"{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="x"
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_signature"


def test_webhook_processes_succeeded_event(api_client, monkeypatch):
    reservation = ReservationFactory(status=_Status.PENDING_PAYMENT)
    PaymentFactory(
        reservation=reservation,
        status=Payment.Status.PENDING,
        stripe_payment_intent_id="pi_hook",
    )
    event = {"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_hook"}}}
    monkeypatch.setattr(gateway, "construct_event", Mock(return_value=event))

    response = api_client.post(
        WEBHOOK_URL, data=b"{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="sig"
    )

    assert response.status_code == 200
    reservation.refresh_from_db()
    assert reservation.status == _Status.AWAITING_HOST


def test_webhook_acknowledges_unknown_event(api_client, monkeypatch):
    event = {"type": "customer.created", "data": {"object": {}}}
    monkeypatch.setattr(gateway, "construct_event", Mock(return_value=event))
    response = api_client.post(
        WEBHOOK_URL, data=b"{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="sig"
    )
    assert response.status_code == 200
