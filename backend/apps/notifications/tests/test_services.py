import pytest
from django.core import mail

from apps.notifications import services


def test_send_welcome_delivers_one_email_with_subject_and_recipient():
    services.send("welcome", to="jan@example.pl", context={"user": {"first_name": "Jan"}})

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == ["jan@example.pl"]
    assert message.subject == "Witamy w PsiPark!"
    assert "Jan" in message.body


def test_send_renders_context_into_body():
    services.send(
        "password_reset",
        to="ola@example.pl",
        context={"user": {"first_name": "Ola"}, "reset_url": "http://front/reset?token=abc"},
    )

    body = mail.outbox[0].body
    assert "Ola" in body
    assert "http://front/reset?token=abc" in body


def test_send_attaches_html_alternative():
    services.send("welcome", to="jan@example.pl", context={"user": {"first_name": "Jan"}})

    alternatives = mail.outbox[0].alternatives
    assert len(alternatives) == 1
    content, mimetype = alternatives[0]
    assert mimetype == "text/html"
    assert "PsiPark" in content


def test_send_accepts_list_of_recipients():
    services.send("welcome", to=["a@example.pl", "b@example.pl"], context={"user": {}})

    assert mail.outbox[0].to == ["a@example.pl", "b@example.pl"]


def test_send_rejects_unknown_template_key():
    with pytest.raises(KeyError):
        services.send("does_not_exist", to="jan@example.pl", context={})
