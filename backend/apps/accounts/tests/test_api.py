import pytest
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import User
from apps.accounts.tests.factories import DEFAULT_PASSWORD, UserFactory

pytestmark = pytest.mark.django_db

REGISTER_URL = reverse("auth-register")
LOGIN_URL = reverse("auth-login")
REFRESH_URL = reverse("auth-refresh")
LOGOUT_URL = reverse("auth-logout")
RESET_URL = reverse("auth-password-reset")
RESET_CONFIRM_URL = reverse("auth-password-reset-confirm")
ME_URL = reverse("me")
ME_PASSWORD_URL = reverse("me-password")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client):
    """An APIClient authenticated as a fresh client user, plus that user's tokens."""
    user = UserFactory(email="member@example.pl")
    response = api_client.post(
        LOGIN_URL, {"email": user.email, "password": DEFAULT_PASSWORD}, format="json"
    )
    tokens = response.json()
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return api_client, user, tokens


def _register_payload(**overrides):
    payload = {
        "email": "nowy@example.pl",
        "first_name": "Jan",
        "last_name": "Kowalski",
        "role": "client",
        "password": "trudnehaslo123",
        "password_confirm": "trudnehaslo123",
        "terms_accepted": True,
    }
    payload.update(overrides)
    return payload


# --- register -------------------------------------------------------------------------


def test_register_returns_user_and_tokens(api_client):
    response = api_client.post(REGISTER_URL, _register_payload(), format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["access"] and body["refresh"]
    assert body["user"]["email"] == "nowy@example.pl"
    assert body["user"]["role"] == "client"
    assert "password" not in body["user"]
    assert len(mail.outbox) == 1  # welcome


def test_register_host_role(api_client):
    response = api_client.post(
        REGISTER_URL, _register_payload(email="h@example.pl", role="host"), format="json"
    )
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "host"
    assert User.objects.get(email="h@example.pl").is_host


def test_register_rejects_admin_role(api_client):
    response = api_client.post(REGISTER_URL, _register_payload(role="admin"), format="json")
    assert response.status_code == 400
    assert "role" in response.json()


def test_register_requires_terms_acceptance(api_client):
    response = api_client.post(REGISTER_URL, _register_payload(terms_accepted=False), format="json")
    assert response.status_code == 400
    assert "terms_accepted" in response.json()


def test_register_rejects_weak_password(api_client):
    response = api_client.post(
        REGISTER_URL,
        _register_payload(password="123", password_confirm="123"),
        format="json",
    )
    assert response.status_code == 400
    assert "password" in response.json()


def test_register_rejects_password_mismatch(api_client):
    response = api_client.post(
        REGISTER_URL, _register_payload(password_confirm="inne12345"), format="json"
    )
    assert response.status_code == 400
    assert "password_confirm" in response.json()


def test_register_rejects_duplicate_email(api_client):
    UserFactory(email="taken@example.pl")
    response = api_client.post(
        REGISTER_URL, _register_payload(email="taken@example.pl"), format="json"
    )
    assert response.status_code == 400
    assert "email" in response.json()


def test_register_rejects_invalid_phone(api_client):
    response = api_client.post(REGISTER_URL, _register_payload(phone="abc"), format="json")
    assert response.status_code == 400
    assert "phone" in response.json()


# --- login ----------------------------------------------------------------------------


def test_login_returns_tokens_and_user(api_client):
    UserFactory(email="login@example.pl")
    response = api_client.post(
        LOGIN_URL, {"email": "login@example.pl", "password": DEFAULT_PASSWORD}, format="json"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access"] and body["refresh"]
    assert body["user"]["email"] == "login@example.pl"


def test_login_rejects_wrong_password(api_client):
    UserFactory(email="login@example.pl")
    response = api_client.post(
        LOGIN_URL, {"email": "login@example.pl", "password": "zlehaslo"}, format="json"
    )
    assert response.status_code == 401


def test_login_rejects_inactive_user(api_client):
    UserFactory(email="blocked@example.pl", is_active=False)
    response = api_client.post(
        LOGIN_URL, {"email": "blocked@example.pl", "password": DEFAULT_PASSWORD}, format="json"
    )
    assert response.status_code == 401


# --- refresh (rotation + blacklist) ---------------------------------------------------


def test_refresh_rotates_and_blacklists_old_token(api_client):
    UserFactory(email="rot@example.pl")
    login = api_client.post(
        LOGIN_URL, {"email": "rot@example.pl", "password": DEFAULT_PASSWORD}, format="json"
    ).json()

    rotated = api_client.post(REFRESH_URL, {"refresh": login["refresh"]}, format="json")
    assert rotated.status_code == 200
    new_tokens = rotated.json()
    assert new_tokens["access"]
    assert new_tokens["refresh"] != login["refresh"]  # rotation issued a new refresh

    # Re-using the rotated-out refresh is rejected (blacklist after rotation).
    reused = api_client.post(REFRESH_URL, {"refresh": login["refresh"]}, format="json")
    assert reused.status_code == 401


# --- logout ---------------------------------------------------------------------------


def test_logout_blacklists_refresh(auth_client):
    client, _user, tokens = auth_client
    response = client.post(LOGOUT_URL, {"refresh": tokens["refresh"]}, format="json")
    assert response.status_code == 205

    reused = APIClient().post(REFRESH_URL, {"refresh": tokens["refresh"]}, format="json")
    assert reused.status_code == 401


def test_logout_requires_authentication(api_client):
    response = api_client.post(LOGOUT_URL, {"refresh": "whatever"}, format="json")
    assert response.status_code == 401


def test_logout_rejects_invalid_refresh_token(auth_client):
    client, _user, _ = auth_client
    response = client.post(LOGOUT_URL, {"refresh": "not-a-real-token"}, format="json")
    assert response.status_code == 400
    assert response.json()["code"] == "token_not_valid"


# --- /me/ -----------------------------------------------------------------------------


def test_me_requires_authentication(api_client):
    assert api_client.get(ME_URL).status_code == 401


def test_me_returns_profile(auth_client):
    client, user, _ = auth_client
    response = client.get(ME_URL)
    assert response.status_code == 200
    assert response.json()["email"] == user.email


def test_me_patch_updates_profile(auth_client):
    client, user, _ = auth_client
    response = client.patch(ME_URL, {"first_name": "Janek", "phone": "+48111222333"}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Janek"
    assert user.phone == "+48111222333"


def test_me_patch_cannot_change_role_or_email(auth_client):
    client, user, _ = auth_client
    original_email = user.email
    response = client.patch(ME_URL, {"role": "admin", "email": "evil@example.pl"}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.role == User.Role.CLIENT
    assert user.email == original_email


def test_me_patch_rejects_invalid_phone(auth_client):
    client, _user, _ = auth_client
    response = client.patch(ME_URL, {"phone": "123"}, format="json")
    assert response.status_code == 400
    assert "phone" in response.json()


def test_me_delete_deactivates_and_revokes_access(auth_client):
    client, user, tokens = auth_client
    assert client.delete(ME_URL).status_code == 204

    user.refresh_from_db()
    assert user.is_active is False
    assert user.first_name == ""

    # The access token is now rejected (user inactive)...
    assert client.get(ME_URL).status_code == 401
    # ...and the refresh token was blacklisted.
    reused = APIClient().post(REFRESH_URL, {"refresh": tokens["refresh"]}, format="json")
    assert reused.status_code == 401


# --- change password ------------------------------------------------------------------


def test_change_password_succeeds_and_new_password_works(auth_client):
    client, user, _ = auth_client
    response = client.patch(
        ME_PASSWORD_URL,
        {
            "old_password": DEFAULT_PASSWORD,
            "new_password": "zupelnienowe1",
            "new_password_confirm": "zupelnienowe1",
        },
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password("zupelnienowe1")


def test_change_password_rejects_wrong_old_password(auth_client):
    client, _user, _ = auth_client
    response = client.patch(
        ME_PASSWORD_URL,
        {
            "old_password": "zlehaslo",
            "new_password": "zupelnienowe1",
            "new_password_confirm": "zupelnienowe1",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "old_password" in response.json()


def test_change_password_rejects_weak_new_password(auth_client):
    client, _user, _ = auth_client
    response = client.patch(
        ME_PASSWORD_URL,
        {"old_password": DEFAULT_PASSWORD, "new_password": "123", "new_password_confirm": "123"},
        format="json",
    )
    assert response.status_code == 400
    assert "new_password" in response.json()


def test_change_password_requires_authentication(api_client):
    response = api_client.patch(ME_PASSWORD_URL, {}, format="json")
    assert response.status_code == 401


# --- password reset -------------------------------------------------------------------


def test_password_reset_request_always_ok_and_sends_email(api_client):
    UserFactory(email="reset@example.pl")
    response = api_client.post(RESET_URL, {"email": "reset@example.pl"}, format="json")
    assert response.status_code == 200
    assert len(mail.outbox) == 1


def test_password_reset_request_hides_unknown_email(api_client):
    response = api_client.post(RESET_URL, {"email": "ghost@example.pl"}, format="json")
    assert response.status_code == 200  # no enumeration
    assert mail.outbox == []


def test_password_reset_confirm_full_flow(api_client):
    user = UserFactory(email="flow@example.pl")
    api_client.post(RESET_URL, {"email": "flow@example.pl"}, format="json")
    body = mail.outbox[0].body
    uid = body.split("uid=")[1].split("&")[0]
    token = body.split("token=")[1].split("\n")[0].strip()

    confirm = api_client.post(
        RESET_CONFIRM_URL,
        {
            "uid": uid,
            "token": token,
            "new_password": "nowehaslo123",
            "new_password_confirm": "nowehaslo123",
        },
        format="json",
    )
    assert confirm.status_code == 200

    login = api_client.post(
        LOGIN_URL, {"email": "flow@example.pl", "password": "nowehaslo123"}, format="json"
    )
    assert login.status_code == 200
    user.refresh_from_db()
    assert user.check_password("nowehaslo123")


def test_password_reset_confirm_rejects_bad_token(api_client):
    user = UserFactory()
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    response = api_client.post(
        RESET_CONFIRM_URL,
        {
            "uid": uid,
            "token": "invalid-token",
            "new_password": "nowehaslo123",
            "new_password_confirm": "nowehaslo123",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "token" in response.json()


# --- throttling (auth scope) ----------------------------------------------------------


def test_auth_scope_is_throttled(api_client, monkeypatch):
    # ScopedRateThrottle binds THROTTLE_RATES at class-definition time, so overriding the
    # REST_FRAMEWORK setting has no effect — patch the class attribute directly instead.
    monkeypatch.setattr(
        ScopedRateThrottle,
        "THROTTLE_RATES",
        {"anon": "100000/min", "user": "100000/min", "auth": "3/min"},
    )
    # The throttle cache is cleared around every test by an autouse fixture (conftest).
    statuses = [
        api_client.post(
            LOGIN_URL, {"email": "x@example.pl", "password": "bad"}, format="json"
        ).status_code
        for _ in range(4)
    ]
    assert statuses[:3] == [401, 401, 401]
    assert statuses[3] == 429
