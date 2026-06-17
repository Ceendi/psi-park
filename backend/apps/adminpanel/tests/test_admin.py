"""Django-admin action tests (PLAN 15-B9, AD-12).

The actions are thin wrappers over ``adminpanel.services`` (already covered in
test_services), so these prove the *wiring*: the action is registered on the re-registered
admin, runs over a queryset, and the User block action skips admin accounts. They call the
action methods directly with a stub request carrying a message store.
"""

import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.messages.storage.fallback import FallbackStorage
from django.core import mail
from django.test import RequestFactory

from apps.accounts.models import User
from apps.accounts.tests.factories import HostFactory, UserFactory
from apps.adminpanel.admin import GardenAdmin, UserAdmin
from apps.adminpanel.tests.factories import AdminFactory
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory

pytestmark = pytest.mark.django_db


def _request(user):
    request = RequestFactory().post("/admin/")
    request.user = user
    request.session = {}
    request._messages = FallbackStorage(request)
    return request


def test_admin_is_registered_with_subclasses():
    """adminpanel re-registered the Garden/User admins with the moderation actions."""
    from django.contrib import admin

    assert isinstance(admin.site._registry[Garden], GardenAdmin)
    assert isinstance(admin.site._registry[User], UserAdmin)


def test_garden_approve_action_publishes_and_emails():
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    model_admin = GardenAdmin(Garden, AdminSite())

    model_admin.approve_gardens(_request(AdminFactory()), Garden.objects.filter(id=garden.id))

    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.APPROVED
    assert len(mail.outbox) == 1


def test_garden_reject_action_sets_status_and_emails():
    garden = GardenFactory(verification_status=Garden.Verification.PENDING)
    model_admin = GardenAdmin(Garden, AdminSite())

    model_admin.reject_gardens(_request(AdminFactory()), Garden.objects.filter(id=garden.id))

    garden.refresh_from_db()
    assert garden.verification_status == Garden.Verification.REJECTED
    assert garden.rejection_reason != ""
    assert len(mail.outbox) == 1


def test_user_verify_action_only_verifies_hosts():
    host = HostFactory()
    client = UserFactory(role=User.Role.CLIENT)
    model_admin = UserAdmin(User, AdminSite())

    model_admin.verify_hosts(
        _request(AdminFactory()), User.objects.filter(id__in=[host.id, client.id])
    )

    host.refresh_from_db()
    client.refresh_from_db()
    assert host.verified_at is not None
    assert client.verified_at is None


def test_user_block_action_skips_admins():
    other_admin = AdminFactory()
    client = UserFactory(role=User.Role.CLIENT)
    model_admin = UserAdmin(User, AdminSite())

    model_admin.block_users(
        _request(AdminFactory()), User.objects.filter(id__in=[other_admin.id, client.id])
    )

    other_admin.refresh_from_db()
    client.refresh_from_db()
    assert other_admin.is_active is True  # admin skipped
    assert client.is_active is False


def test_user_unblock_action_reactivates():
    blocked = UserFactory(role=User.Role.CLIENT, is_active=False)
    model_admin = UserAdmin(User, AdminSite())

    model_admin.unblock_users(_request(AdminFactory()), User.objects.filter(id=blocked.id))

    blocked.refresh_from_db()
    assert blocked.is_active is True
