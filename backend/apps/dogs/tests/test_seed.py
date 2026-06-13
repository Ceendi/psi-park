import pytest
from django.core.management import call_command

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_demo_client_with_dogs():
    call_command("seed_demo")

    owner = User.objects.get(email="katarzyna@psipark.local")
    assert owner.is_client
    assert {dog.name for dog in owner.dogs.all()} == {"Łata", "Borys"}


def test_seed_demo_dogs_are_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")

    owner = User.objects.get(email="katarzyna@psipark.local")
    assert owner.dogs.count() == 2
