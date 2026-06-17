"""Service-level tests for admin operations (PLAN 15-B9, 6.4).

Cover the state change, the e-mail side effect (locmem ``mail.outbox``) and the guard rails:
non-host verify and admin-block raise, idempotent calls do not re-notify, missing ids 404.
"""

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.adminpanel import services
from apps.adminpanel.services import CannotBlockAdmin, HostRoleRequired
from apps.adminpanel.tests.factories import AdminFactory
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory
from apps.reviews.models import Review
from apps.reviews.tests.factories import ReviewFactory

pytestmark = pytest.mark.django_db


# --- gardens --------------------------------------------------------------------------


def test_approve_garden_makes_public_and_emails_host():
    garden = GardenFactory(
        verification_status=Garden.Verification.PENDING, rejection_reason="stary powód"
    )
    services.approve_garden(garden_id=garden.id)

    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.APPROVED
    assert garden.is_public is True
    assert garden.rejection_reason == ""
    assert len(mail.outbox) == 1
    assert garden.host.email in mail.outbox[0].to


def test_reject_garden_stores_reason_and_emails_host():
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    services.reject_garden(garden_id=garden.id, reason="Brak ogrodzenia od północy.")

    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.REJECTED
    assert garden.rejection_reason == "Brak ogrodzenia od północy."
    assert garden.is_public is False
    assert len(mail.outbox) == 1
    assert "Brak ogrodzenia od północy." in mail.outbox[0].body


def test_approve_unknown_garden_raises_not_found():
    with pytest.raises(NotFound):
        services.approve_garden(garden_id=999_999)


# --- host verification ----------------------------------------------------------------


def test_verify_host_sets_badge_and_emails():
    host = HostFactory()
    assert host.verified_at is None

    services.verify_host(user_id=host.id)

    host.refresh_from_db()
    assert host.verified_at is not None
    assert host.is_verified_host is True
    assert len(mail.outbox) == 1
    assert host.email in mail.outbox[0].to


def test_verify_already_verified_host_is_idempotent_and_silent():
    when = timezone.now()
    host = HostFactory(verified_at=when)

    services.verify_host(user_id=host.id)

    host.refresh_from_db()
    assert host.verified_at == when
    assert mail.outbox == []


def test_verify_non_host_rejected():
    client = UserFactory(role=User.Role.CLIENT)
    with pytest.raises(HostRoleRequired):
        services.verify_host(user_id=client.id)
    assert mail.outbox == []


# --- block / unblock ------------------------------------------------------------------


def test_block_then_unblock_user_toggles_is_active():
    user = UserFactory(role=User.Role.CLIENT)

    services.block_user(user_id=user.id)
    user.refresh_from_db()
    assert user.is_active is False

    services.unblock_user(user_id=user.id)
    user.refresh_from_db()
    assert user.is_active is True


def test_cannot_block_admin_account():
    admin = AdminFactory()
    with pytest.raises(CannotBlockAdmin):
        services.block_user(user_id=admin.id)
    admin.refresh_from_db()
    assert admin.is_active is True


def test_block_unknown_user_raises_not_found():
    with pytest.raises(NotFound):
        services.block_user(user_id=999_999)


# --- review moderation ----------------------------------------------------------------


def test_delete_review_removes_it():
    review = ReviewFactory()
    services.delete_review(review_id=review.id)
    assert not Review.objects.filter(id=review.id).exists()


def test_delete_unknown_review_raises_not_found():
    with pytest.raises(NotFound):
        services.delete_review(review_id=999_999)
