"""Read-side queries for accounts (PLAN 5.1, 6.2)."""

from apps.accounts.models import User


def active_user_by_email(*, email: str) -> User | None:
    """Return the active user with this e-mail, or ``None``.

    Used by the password-reset flow, which must not reveal whether an address is
    registered — callers therefore treat ``None`` the same as success.
    """
    return User.objects.filter(email__iexact=email, is_active=True).first()
