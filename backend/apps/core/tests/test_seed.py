import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_admin():
    call_command("seed_demo")

    admin = get_user_model().objects.get(email="admin@psipark.local")
    assert admin.is_superuser
    assert admin.role == get_user_model().Role.ADMIN


def test_seed_demo_is_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")

    assert get_user_model().objects.filter(email="admin@psipark.local").count() == 1
