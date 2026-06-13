"""Account factories, reused by later parts that need users (PLAN 5.1)."""

import factory
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.accounts.models import User

DEFAULT_PASSWORD = "pass12345"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.pl")
    first_name = "Jan"
    last_name = "Kowalski"
    role = User.Role.CLIENT
    terms_accepted_at = factory.LazyFunction(timezone.now)
    # Pre-hash so the password is persisted by the initial INSERT (a post_generation
    # set_password would run after save and be lost). Hashed with the active hasher.
    password = factory.LazyFunction(lambda: make_password(DEFAULT_PASSWORD))


class HostFactory(UserFactory):
    email = factory.Sequence(lambda n: f"host{n}@example.pl")
    role = User.Role.HOST
