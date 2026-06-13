"""E-mail facade (PLAN 10.2 / AD-8).

Single entry point for every outbound e-mail: ``send(template_key, *, to, context)``.
Callers never touch Django's mail API directly (SRP — PLAN 6.1), which keeps the
delivery mechanism swappable later (a queue) behind a stable signature (DIP).

Part B10 owns this module. It registers every key from PLAN 10.2 and adds the optional
``attachments`` argument needed to ship the invoice PDF with ``reservation_paid`` — an
additive, backward-compatible extension of the B1 signature (PLAN 17.3): existing
callers ``send(key, to=..., context=...)`` keep working unchanged.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

# An e-mail attachment as accepted by ``EmailMessage.attach(filename, content, mimetype)``.
Attachment = tuple[str, bytes, str]


@dataclass(frozen=True)
class EmailTemplate:
    """A registered e-mail: subject plus paths to the text and HTML bodies."""

    subject: str
    text_template: str
    html_template: str


# Registry of known e-mails (OCP: add a key + template files, no code change — PLAN 6.1).
# Every key from PLAN 10.2 is registered here; the recipient and the context contract for
# each are documented in notifications/README of the templates (see emails/*.txt headers).
TEMPLATES: dict[str, EmailTemplate] = {
    # --- Accounts (B1) ---
    "welcome": EmailTemplate(
        subject="Witamy w PsiPark!",
        text_template="emails/welcome.txt",
        html_template="emails/welcome.html",
    ),
    "password_reset": EmailTemplate(
        subject="Reset hasła w PsiPark",
        text_template="emails/password_reset.txt",
        html_template="emails/password_reset.html",
    ),
    # --- Reservations / payments (B4, B5) ---
    "reservation_created": EmailTemplate(
        subject="Nowa rezerwacja czeka na Twoją decyzję",
        text_template="emails/reservation_created.txt",
        html_template="emails/reservation_created.html",
    ),
    "reservation_paid": EmailTemplate(
        subject="Potwierdzenie płatności — rezerwacja opłacona",
        text_template="emails/reservation_paid.txt",
        html_template="emails/reservation_paid.html",
    ),
    "reservation_accepted": EmailTemplate(
        subject="Twoja rezerwacja została potwierdzona",
        text_template="emails/reservation_accepted.txt",
        html_template="emails/reservation_accepted.html",
    ),
    "reservation_rejected": EmailTemplate(
        subject="Twoja rezerwacja została odrzucona",
        text_template="emails/reservation_rejected.txt",
        html_template="emails/reservation_rejected.html",
    ),
    "reservation_cancelled": EmailTemplate(
        subject="Rezerwacja została anulowana",
        text_template="emails/reservation_cancelled.txt",
        html_template="emails/reservation_cancelled.html",
    ),
    # --- Gardens / host (B9) ---
    "garden_approved": EmailTemplate(
        subject="Twój ogród został zatwierdzony",
        text_template="emails/garden_approved.txt",
        html_template="emails/garden_approved.html",
    ),
    "garden_rejected": EmailTemplate(
        subject="Twój ogród wymaga poprawek",
        text_template="emails/garden_rejected.txt",
        html_template="emails/garden_rejected.html",
    ),
    "host_verified": EmailTemplate(
        subject="Twoje konto gospodarza zostało zweryfikowane",
        text_template="emails/host_verified.txt",
        html_template="emails/host_verified.html",
    ),
}


class _Readable(Protocol):
    """A minimal file-like that yields bytes (e.g. a Django ``FieldFile``)."""

    def read(self) -> bytes: ...


def invoice_pdf_attachment(*, number: str, pdf: bytes | _Readable) -> Attachment:
    """Build the e-mail attachment triple for an invoice PDF.

    The returned ``(filename, content, mimetype)`` matches the arguments of Django's
    ``EmailMessage.attach`` so callers pass it straight through
    ``send("reservation_paid", ..., attachments=[...])`` without touching the mail API.

    Decoupled from ``invoices.Invoice`` on purpose — B10 depends only on B0 — so B5/B6
    hand over the already-rendered PDF (bytes or a ``FieldFile``) and its number.

    Args:
        number: invoice number ``PSI/RRRR/MM/NNNN``; slashes become ``_`` in the filename.
        pdf: the PDF as raw bytes or any object with ``.read()`` returning bytes.
    """
    content = pdf.read() if hasattr(pdf, "read") else pdf
    safe_number = number.replace("/", "_")
    return (f"faktura-{safe_number}.pdf", content, "application/pdf")


def send(
    template_key: str,
    *,
    to: str | list[str],
    context: dict | None = None,
    attachments: Sequence[Attachment] | None = None,
) -> None:
    """Render a registered template and send it synchronously over SMTP (Mailpit in dev).

    Args:
        template_key: key into ``TEMPLATES``.
        to: a single recipient address or a list of addresses.
        context: variables for the template; ``frontend_base_url`` is always injected.
        attachments: optional ``(filename, content, mimetype)`` triples — used by
            ``reservation_paid`` for the invoice PDF (see ``invoice_pdf_attachment``).

    Raises:
        KeyError: when ``template_key`` is not registered.
    """
    template = TEMPLATES[template_key]
    recipients = [to] if isinstance(to, str) else list(to)
    render_context = {"frontend_base_url": settings.FRONTEND_BASE_URL, **(context or {})}

    text_body = render_to_string(template.text_template, render_context)
    html_body = render_to_string(template.html_template, render_context)

    message = EmailMultiAlternatives(
        subject=template.subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    message.attach_alternative(html_body, "text/html")
    for attachment in attachments or []:
        message.attach(*attachment)
    message.send()
