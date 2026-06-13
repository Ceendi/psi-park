"""Tests for the e-mail facade (PLAN B10 / 10.2).

Covered: every registered template renders with its context and reaches the outbox with
the right subject and recipient; the registry matches PLAN 10.2 exactly and rejects
unknown keys; the invoice PDF rides along with ``reservation_paid``.
"""

import io
from datetime import datetime
from decimal import Decimal

import pytest
from django.conf import settings
from django.core import mail
from django.utils.timezone import make_aware

from apps.notifications import services

# --- Shared sample data (duck-typed dicts: templates resolve dict keys like attributes) ---

_START = make_aware(datetime(2026, 5, 24, 15, 0))
_END = make_aware(datetime(2026, 5, 24, 17, 0))

_HOST = {"first_name": "Magda", "email": "magda@example.pl"}
_CLIENT = {"first_name": "Katarzyna", "email": "kasia@example.pl"}

_GARDEN = {"title": "Zielona Polana", "city": "Kraków"}

_RESERVATION = {
    "garden": _GARDEN,
    "client": _CLIENT,
    "dog": {"name": "Łata"},
    "dogs_count": 1,
    "start_time": _START,
    "end_time": _END,
    "total_price": Decimal("99.00"),
}

# One representative context per registered key — drives the render/send sweep below.
SAMPLE_CONTEXTS: dict[str, dict] = {
    "welcome": {"user": _CLIENT, "is_host": False},
    "password_reset": {"user": _CLIENT, "reset_url": "http://front/reset?token=abc"},
    "reservation_created": {"user": _HOST, "reservation": _RESERVATION},
    "reservation_paid": {
        "user": _CLIENT,
        "reservation": _RESERVATION,
        "invoice_number": "PSI/2026/05/0007",
    },
    "reservation_accepted": {"user": _CLIENT, "reservation": _RESERVATION},
    "reservation_rejected": {
        "user": _CLIENT,
        "reservation": _RESERVATION,
        "reason": "Termin niedostępny",
    },
    "reservation_cancelled": {"user": _HOST, "reservation": _RESERVATION, "refunded": True},
    "garden_approved": {"user": _HOST, "garden": _GARDEN},
    "garden_rejected": {
        "user": _HOST,
        "garden": _GARDEN,
        "reason": "Zdjęcia za małej rozdzielczości",
    },
    "host_verified": {"user": _HOST},
}

# Keys B10 adds (every one carries a CTA link and the branded footer built from
# FRONTEND_BASE_URL); the two B1 templates are validated by their own assertions below.
NEW_KEYS = sorted(set(SAMPLE_CONTEXTS) - {"welcome", "password_reset"})


# --- Registry contract (PLAN 10.2) ---


def test_registry_matches_plan_keys_exactly():
    expected = {
        "welcome",
        "password_reset",
        "reservation_created",
        "reservation_paid",
        "reservation_accepted",
        "reservation_rejected",
        "reservation_cancelled",
        "garden_approved",
        "garden_rejected",
        "host_verified",
    }
    assert set(services.TEMPLATES) == expected


def test_every_key_has_a_sample_context():
    # Guards the sweep below against a newly registered key slipping through untested.
    assert set(SAMPLE_CONTEXTS) == set(services.TEMPLATES)


def test_send_rejects_unknown_template_key():
    with pytest.raises(KeyError):
        services.send("does_not_exist", to="jan@example.pl", context={})


# --- Render + deliver sweep over every template ---


@pytest.mark.parametrize("key", sorted(SAMPLE_CONTEXTS))
def test_template_renders_and_delivers(key):
    services.send(key, to="odbiorca@example.pl", context=SAMPLE_CONTEXTS[key])

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == ["odbiorca@example.pl"]
    assert message.from_email == settings.DEFAULT_FROM_EMAIL
    assert message.subject == services.TEMPLATES[key].subject
    assert message.body.strip()  # text body rendered, non-empty

    ((html, mimetype),) = message.alternatives
    assert mimetype == "text/html"
    assert "PsiPark" in html


@pytest.mark.parametrize("key", NEW_KEYS)
def test_frontend_base_url_is_injected(key):
    services.send(key, to="odbiorca@example.pl", context=SAMPLE_CONTEXTS[key])
    assert settings.FRONTEND_BASE_URL in mail.outbox[0].body


# --- Context lands in the rendered body ---


def test_reservation_created_shows_garden_dog_and_time():
    services.send(
        "reservation_created", to=_HOST["email"], context=SAMPLE_CONTEXTS["reservation_created"]
    )
    body = mail.outbox[0].body
    assert "Zielona Polana" in body
    assert "Łata" in body
    assert "15:00" in body and "17:00" in body  # date filter rendered the window


def test_reservation_paid_mentions_invoice_number():
    services.send(
        "reservation_paid", to=_CLIENT["email"], context=SAMPLE_CONTEXTS["reservation_paid"]
    )
    assert "PSI/2026/05/0007" in mail.outbox[0].body


def test_reservation_rejected_includes_reason():
    services.send(
        "reservation_rejected", to=_CLIENT["email"], context=SAMPLE_CONTEXTS["reservation_rejected"]
    )
    assert "Termin niedostępny" in mail.outbox[0].body


def test_garden_rejected_includes_admin_reason():
    services.send("garden_rejected", to=_HOST["email"], context=SAMPLE_CONTEXTS["garden_rejected"])
    assert "Zdjęcia za małej rozdzielczości" in mail.outbox[0].body


def test_footer_carries_liability_disclaimer():
    services.send("host_verified", to=_HOST["email"], context=SAMPLE_CONTEXTS["host_verified"])
    body = mail.outbox[0].body
    assert "nie odpowiada za szkody" in body  # PLAN 11 disclaimer in the branded footer


# --- Invoice PDF attachment helper (PLAN 10.2: "Helper do załączania PDF faktury") ---


def test_invoice_pdf_attachment_from_bytes_sanitizes_number():
    filename, content, mimetype = services.invoice_pdf_attachment(
        number="PSI/2026/05/0007", pdf=b"%PDF-1.4 fake"
    )
    assert filename == "faktura-PSI_2026_05_0007.pdf"
    assert content == b"%PDF-1.4 fake"
    assert mimetype == "application/pdf"


def test_invoice_pdf_attachment_reads_file_like():
    _, content, _ = services.invoice_pdf_attachment(
        number="PSI/2026/05/0007", pdf=io.BytesIO(b"pdf-bytes")
    )
    assert content == b"pdf-bytes"


def test_reservation_paid_carries_invoice_attachment():
    attachment = services.invoice_pdf_attachment(number="PSI/2026/05/0007", pdf=b"%PDF-1.4 fake")
    services.send(
        "reservation_paid",
        to=_CLIENT["email"],
        context=SAMPLE_CONTEXTS["reservation_paid"],
        attachments=[attachment],
    )

    ((att_name, att_content, att_mimetype),) = mail.outbox[0].attachments
    assert att_name == "faktura-PSI_2026_05_0007.pdf"
    assert att_content == b"%PDF-1.4 fake"
    assert att_mimetype == "application/pdf"


def test_send_without_attachments_attaches_nothing():
    services.send("welcome", to="jan@example.pl", context={"user": {"first_name": "Jan"}})
    assert mail.outbox[0].attachments == []


# --- Recipient handling (regression coverage from the B1 stub) ---


def test_send_accepts_list_of_recipients():
    services.send("welcome", to=["a@example.pl", "b@example.pl"], context={"user": {}})
    assert mail.outbox[0].to == ["a@example.pl", "b@example.pl"]


def test_send_attaches_html_alternative():
    services.send("welcome", to="jan@example.pl", context={"user": {"first_name": "Jan"}})
    ((content, mimetype),) = mail.outbox[0].alternatives
    assert mimetype == "text/html"
    assert "PsiPark" in content
