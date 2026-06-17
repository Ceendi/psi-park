"""Admin moderation operations (PLAN 8.2 Admin, 15-B9).

Each function is one admin use case (SRP, PLAN 6.1): it loads the target by id (404 when
missing), applies the change inside a transaction, fires the matching e-mail through the
notifications facade (DIP — never Django's mail API directly) and returns the updated
object. Both the REST views (F8) and the Django-admin actions call these, so the two
admin surfaces share one code path (AD-12). Keyword-only args, PLAN 6.2.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.core.exceptions import BusinessError
from apps.gardens.models import Garden
from apps.notifications import services as notifications
from apps.reviews.models import Review


class HostRoleRequired(BusinessError):
    """Raised when an account that is not a host is submitted for host verification.

    Code is adminpanel-specific (not in PLAN 6.3) — a guard rail on an admin-only endpoint
    the F8 UI never normally triggers; follows the B2 ``dog_has_reservations`` precedent.
    """

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Zweryfikować można wyłącznie konto gospodarza."
    default_code = "host_role_required"


class CannotBlockAdmin(BusinessError):
    """Raised when an admin account is submitted for blocking (a self-lockout safety guard)."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Nie można zablokować konta administratora."
    default_code = "cannot_block_admin"


def _get_garden(*, garden_id: int) -> Garden:
    """Load a garden with its host joined, or 404."""
    try:
        return Garden.objects.select_related("host").get(id=garden_id)
    except Garden.DoesNotExist as exc:
        raise NotFound("Nie znaleziono ogrodu.") from exc


@transaction.atomic
def approve_garden(*, garden_id: int) -> Garden:
    """Approve a garden so it becomes publicly visible and e-mail its host (PLAN 8.2).

    Clears any earlier rejection reason. Idempotent: re-approving an approved garden simply
    re-confirms it (the admin's explicit intent), so the host is notified again.
    """
    garden = _get_garden(garden_id=garden_id)
    garden.verification_status = Garden.Verification.APPROVED
    garden.rejection_reason = ""
    garden.save(update_fields=["verification_status", "rejection_reason", "updated_at"])
    notifications.send(
        "garden_approved",
        to=garden.host.email,
        context={"user": garden.host, "garden": garden},
    )
    return garden


@transaction.atomic
def reject_garden(*, garden_id: int, reason: str) -> Garden:
    """Reject a garden, store the admin's ``reason`` and e-mail the host (PLAN 8.2).

    The garden stays out of the public catalogue (``verification_status=rejected``); the host
    edits and resubmits it (the gardens app sends a significant edit back to ``pending``).
    """
    garden = _get_garden(garden_id=garden_id)
    garden.verification_status = Garden.Verification.REJECTED
    garden.rejection_reason = reason
    garden.save(update_fields=["verification_status", "rejection_reason", "updated_at"])
    notifications.send(
        "garden_rejected",
        to=garden.host.email,
        context={"user": garden.host, "garden": garden, "reason": reason},
    )
    return garden


def _get_user(*, user_id: int) -> User:
    """Load an account by id, or 404."""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist as exc:
        raise NotFound("Nie znaleziono użytkownika.") from exc


@transaction.atomic
def verify_host(*, user_id: int) -> User:
    """Mark a host account as verified — the "Zweryfikowany gospodarz" badge + e-mail.

    Only ``host`` accounts can be verified. Idempotent: a host already verified keeps its
    original ``verified_at`` and is not e-mailed a second time.

    Raises:
        NotFound: the account does not exist (404).
        HostRoleRequired: the target account is not a host (400).
    """
    user = _get_user(user_id=user_id)
    if user.role != User.Role.HOST:
        raise HostRoleRequired()
    if user.verified_at is None:
        user.verified_at = timezone.now()
        user.save(update_fields=["verified_at", "updated_at"])
        notifications.send("host_verified", to=user.email, context={"user": user})
    return user


@transaction.atomic
def block_user(*, user_id: int) -> User:
    """Deactivate an account so its holder can no longer log in (``is_active=False``).

    Admin accounts cannot be blocked (a guard against locking the platform out of itself).
    Idempotent: blocking an already-blocked account is a no-op.

    Raises:
        NotFound: the account does not exist (404).
        CannotBlockAdmin: the target is an admin account (400).
    """
    user = _get_user(user_id=user_id)
    if user.role == User.Role.ADMIN:
        raise CannotBlockAdmin()
    if user.is_active:
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
    return user


@transaction.atomic
def unblock_user(*, user_id: int) -> User:
    """Re-activate a previously blocked account (``is_active=True``). Idempotent.

    Raises:
        NotFound: the account does not exist (404).
    """
    user = _get_user(user_id=user_id)
    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active", "updated_at"])
    return user


def delete_review(*, review_id: int) -> None:
    """Remove a review that violates the rules (moderation, PLAN 8.2).

    The garden's rating aggregate is annotated on read, so it self-corrects on the next query.

    Raises:
        NotFound: the review does not exist (404).
    """
    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist as exc:
        raise NotFound("Nie znaleziono recenzji.") from exc
    review.delete()
