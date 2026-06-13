"""Account write operations and business logic (PLAN 5.1, 6.2, 15-B1).

Views validate input with serializers and then call exactly one of these functions.
All functions take keyword-only arguments and own their side effects (e-mails, token
generation) explicitly — no Django signals (PLAN 6.1).
"""

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.selectors import active_user_by_email
from apps.notifications import services as notifications


@transaction.atomic
def register_user(
    *,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role: str,
    phone: str = "",
    marketing_consent: bool = False,
) -> User:
    """Create a client/host account, record GDPR consent and send the welcome e-mail.

    The serializer guarantees the password is strong, the role is ``client``/``host``
    and the terms were accepted, so this service trusts its (validated) input. Terms
    acceptance is timestamped here because registration is impossible without it.
    """
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        phone=phone,
        marketing_consent=marketing_consent,
        terms_accepted_at=timezone.now(),
    )
    notifications.send(
        "welcome",
        to=user.email,
        context={"user": user, "is_host": user.is_host},
    )
    return user


def update_profile(
    *,
    user: User,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    marketing_consent: bool | None = None,
) -> User:
    """Update the editable profile fields; ``role`` and ``email`` are immutable here."""
    updates: dict[str, object] = {
        "first_name": first_name,
        "last_name": last_name,
        "phone": phone,
        "marketing_consent": marketing_consent,
    }
    changed = {field: value for field, value in updates.items() if value is not None}
    for field, value in changed.items():
        setattr(user, field, value)
    if changed:
        user.save(update_fields=[*changed, "updated_at"])
    return user


def change_password(*, user: User, new_password: str) -> None:
    """Set a new password. The serializer already verified the current password."""
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])


def request_password_reset(*, email: str) -> None:
    """Send a reset link if an active account exists; silent no-op otherwise.

    The endpoint never reveals whether the address is registered (anti-enumeration),
    so a missing account is not an error.
    """
    user = active_user_by_email(email=email)
    if user is None:
        return
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{settings.FRONTEND_BASE_URL}/reset-hasla?uid={uid}&token={token}"
    notifications.send(
        "password_reset",
        to=user.email,
        context={"user": user, "reset_url": reset_url, "uid": uid, "token": token},
    )


@transaction.atomic
def confirm_password_reset(*, uid: str, token: str, new_password: str) -> None:
    """Validate the reset token and set the new password.

    Raises:
        serializers.ValidationError: when the link is invalid or has expired.
    """
    invalid = serializers.ValidationError(
        {"token": ["Link do resetu hasła jest nieprawidłowy lub wygasł."]}
    )
    try:
        user_pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_pk, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist) as exc:
        raise invalid from exc

    if not default_token_generator.check_token(user, token):
        raise invalid

    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])


@transaction.atomic
def deactivate_account(*, user: User) -> None:
    """Anonymise personal data and deactivate the account (GDPR — PLAN 11).

    Accounting documents (invoices) reference the user through reservations and must
    be retained by law, so the row is scrubbed in place rather than deleted. Outstanding
    refresh tokens are blacklisted so existing sessions cannot be refreshed.
    """
    # Imported lazily: the blacklist tables belong to a third-party app and this keeps
    # the dependency at the single call site that needs it.
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    user.email = f"deleted+{user.pk}@anonymized.psipark.invalid"
    user.first_name = ""
    user.last_name = ""
    user.phone = ""
    user.marketing_consent = False
    user.is_active = False
    user.set_unusable_password()
    user.save(
        update_fields=[
            "email",
            "first_name",
            "last_name",
            "phone",
            "marketing_consent",
            "is_active",
            "password",
            "updated_at",
        ]
    )

    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)
