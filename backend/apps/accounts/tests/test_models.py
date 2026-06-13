import pytest
from django.utils import timezone

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_create_user_defaults_and_normalisation():
    user = User.objects.create_user(email="Jan@EXAMPLE.PL", password="pass12345")

    assert user.email == "Jan@example.pl"  # domain lower-cased by normalize_email
    assert user.role == User.Role.CLIENT
    assert user.is_client and not user.is_host
    assert user.check_password("pass12345")
    assert not user.is_staff and not user.is_superuser


def test_create_superuser():
    admin = User.objects.create_superuser(email="admin@example.pl", password="pass12345")

    assert admin.is_staff and admin.is_superuser
    assert admin.role == User.Role.ADMIN


def test_full_name_and_str():
    user = User.objects.create_user(
        email="b@example.pl", password="pass12345", first_name="Jan", last_name="Kowalski"
    )

    assert user.full_name == "Jan Kowalski"
    assert str(user) == "b@example.pl"


def test_is_verified_host_toggles_with_verified_at():
    host = User.objects.create_user(email="h@example.pl", password="pass12345", role=User.Role.HOST)
    assert host.is_verified_host is False

    host.verified_at = timezone.now()
    host.save(update_fields=["verified_at"])
    assert host.is_verified_host is True


def test_email_is_required():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="pass12345")
