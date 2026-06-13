"""E-mail facade (PLAN 10.2 / AD-8).

Single entry point for every outbound e-mail: ``send(template_key, *, to, context)``.
Callers never touch Django's mail API directly (SRP — PLAN 6.1), which keeps the
delivery mechanism swappable later (a queue) behind a stable signature (DIP).

This is the minimal facade required by B1 (``welcome`` + ``password_reset``). Part B10
owns this module and extends ``TEMPLATES`` with the remaining keys from PLAN 10.2
without changing the signature (PLAN 17.3).
"""

from dataclasses import dataclass

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


@dataclass(frozen=True)
class EmailTemplate:
    """A registered e-mail: subject plus paths to the text and HTML bodies."""

    subject: str
    text_template: str
    html_template: str


# Registry of known e-mails (OCP: add a key + template files, no code change — PLAN 6.1).
TEMPLATES: dict[str, EmailTemplate] = {
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
}


def send(template_key: str, *, to: str | list[str], context: dict | None = None) -> None:
    """Render a registered template and send it synchronously over SMTP (Mailpit in dev).

    Args:
        template_key: key into ``TEMPLATES``.
        to: a single recipient address or a list of addresses.
        context: variables for the template; ``frontend_base_url`` is always injected.

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
    message.send()
