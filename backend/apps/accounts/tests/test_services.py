import pytest
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from freezegun import freeze_time
from rest_framework import serializers
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts import services
from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


# --- register_user --------------------------------------------------------------------


def test_register_user_creates_client_and_sends_welcome():
    user = services.register_user(
        email="ola@example.pl",
        password="trudnehaslo123",
        first_name="Ola",
        last_name="Nowak",
        role=User.Role.CLIENT,
    )

    assert user.pk is not None
    assert user.is_client
    assert user.check_password("trudnehaslo123")
    assert user.terms_accepted_at is not None
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["ola@example.pl"]
    assert mail.outbox[0].subject == "Witamy w PsiPark!"


def test_register_user_creates_host():
    user = services.register_user(
        email="host@example.pl",
        password="trudnehaslo123",
        first_name="Magda",
        last_name="Krawczyk",
        role=User.Role.HOST,
        phone="+48123456789",
        marketing_consent=True,
    )

    assert user.is_host
    assert user.marketing_consent is True
    assert user.phone == "+48123456789"


# --- update_profile -------------------------------------------------------------------


def test_update_profile_changes_only_supplied_fields():
    user = UserFactory(first_name="Jan", last_name="Kowalski", phone="")

    services.update_profile(user=user, first_name="Janek", phone="+48111222333")
    user.refresh_from_db()

    assert user.first_name == "Janek"
    assert user.last_name == "Kowalski"  # untouched
    assert user.phone == "+48111222333"


def test_update_profile_noop_without_changes():
    user = UserFactory()
    returned = services.update_profile(user=user)
    assert returned == user


# --- change_password ------------------------------------------------------------------


def test_change_password_sets_new_hash():
    user = UserFactory()
    services.change_password(user=user, new_password="zupelnienoweha")
    user.refresh_from_db()
    assert user.check_password("zupelnienoweha")


# --- password reset -------------------------------------------------------------------


def test_request_password_reset_emails_active_user():
    UserFactory(email="reset@example.pl")
    services.request_password_reset(email="reset@example.pl")

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["reset@example.pl"]
    assert "reset-hasla" in mail.outbox[0].body


def test_request_password_reset_is_silent_for_unknown_email():
    services.request_password_reset(email="ghost@example.pl")
    assert mail.outbox == []


def test_request_password_reset_is_silent_for_inactive_user():
    UserFactory(email="blocked@example.pl", is_active=False)
    services.request_password_reset(email="blocked@example.pl")
    assert mail.outbox == []


def test_confirm_password_reset_sets_new_password():
    user = UserFactory()
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    services.confirm_password_reset(uid=uid, token=token, new_password="bezpieczne999")
    user.refresh_from_db()
    assert user.check_password("bezpieczne999")


def test_confirm_password_reset_rejects_bad_token():
    user = UserFactory()
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    with pytest.raises(serializers.ValidationError):
        services.confirm_password_reset(
            uid=uid, token="not-a-valid-token", new_password="x123456789"
        )


def test_confirm_password_reset_rejects_bad_uid():
    with pytest.raises(serializers.ValidationError):
        services.confirm_password_reset(uid="@@@", token="whatever", new_password="x123456789")


def test_confirm_password_reset_rejects_expired_token():
    user = UserFactory()
    with freeze_time("2026-06-01 10:00:00"):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
    # PASSWORD_RESET_TIMEOUT defaults to 3 days; jump well beyond it.
    with freeze_time("2026-06-10 10:00:00"), pytest.raises(serializers.ValidationError):
        services.confirm_password_reset(uid=uid, token=token, new_password="bezpieczne999")


# --- deactivate_account ---------------------------------------------------------------


def test_deactivate_account_anonymises_and_blacklists_tokens():
    user = UserFactory(email="bye@example.pl", first_name="Jan", phone="+48111222333")
    refresh = RefreshToken.for_user(user)  # creates an OutstandingToken row
    assert OutstandingToken.objects.filter(user=user).exists()

    services.deactivate_account(user=user)
    user.refresh_from_db()

    assert user.is_active is False
    assert user.email == f"deleted+{user.pk}@anonymized.psipark.invalid"
    assert user.first_name == ""
    assert user.phone == ""
    assert user.has_usable_password() is False
    assert BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists()
