"""API contract tests for invoices (PLAN 8.2 Faktury).

Covers both reads — metadata and PDF download — across the full auth matrix: the owning
client gets 200, an anonymous request 401, a host 403 (wrong role), and a foreign client or
a not-yet-paid reservation 404 (no invoice is indistinguishable from a foreign one, PLAN 11).
"""

import pytest
from django.urls import reverse

from apps.reservations.tests.factories import ReservationFactory

pytestmark = pytest.mark.django_db


def _meta_url(reservation_id: int) -> str:
    return reverse("invoice-detail", args=[reservation_id])


def _pdf_url(reservation_id: int) -> str:
    return reverse("invoice-pdf", args=[reservation_id])


# --- metadata -------------------------------------------------------------------------


def test_metadata_returns_invoice_data(auth_client, invoice):
    client, _ = auth_client
    response = client.get(_meta_url(invoice.reservation_id))

    assert response.status_code == 200
    body = response.json()
    assert body["number"] == invoice.number
    assert body["reservation"] == invoice.reservation_id
    assert body["total_gross"] == "99.00"
    assert body["pdf_url"].endswith(f"/reservations/{invoice.reservation_id}/invoice/pdf/")


def test_metadata_requires_auth(api_client, invoice):
    assert api_client.get(_meta_url(invoice.reservation_id)).status_code == 401


def test_metadata_forbidden_for_host(api_client, host_user, invoice):
    api_client.force_authenticate(user=host_user)
    assert api_client.get(_meta_url(invoice.reservation_id)).status_code == 403


def test_metadata_foreign_client_returns_404(api_client, other_client, invoice):
    api_client.force_authenticate(user=other_client)
    assert api_client.get(_meta_url(invoice.reservation_id)).status_code == 404


def test_metadata_missing_before_payment_returns_404(auth_client, client_user):
    client, _ = auth_client
    reservation = ReservationFactory(client=client_user)  # no invoice yet
    assert client.get(_meta_url(reservation.id)).status_code == 404


# --- PDF download ---------------------------------------------------------------------


def test_pdf_downloads_as_attachment(auth_client, invoice):
    client, _ = auth_client
    response = client.get(_pdf_url(invoice.reservation_id))

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    disposition = response["Content-Disposition"]
    assert "attachment" in disposition
    assert f"faktura-{invoice.number.replace('/', '_')}.pdf" in disposition
    content = b"".join(response.streaming_content)
    assert content.startswith(b"%PDF")


def test_pdf_requires_auth(api_client, invoice):
    assert api_client.get(_pdf_url(invoice.reservation_id)).status_code == 401


def test_pdf_forbidden_for_host(api_client, host_user, invoice):
    api_client.force_authenticate(user=host_user)
    assert api_client.get(_pdf_url(invoice.reservation_id)).status_code == 403


def test_pdf_foreign_client_returns_404(api_client, other_client, invoice):
    api_client.force_authenticate(user=other_client)
    assert api_client.get(_pdf_url(invoice.reservation_id)).status_code == 404


def test_pdf_missing_before_payment_returns_404(auth_client, client_user):
    client, _ = auth_client
    reservation = ReservationFactory(client=client_user)  # no invoice yet
    assert client.get(_pdf_url(reservation.id)).status_code == 404
