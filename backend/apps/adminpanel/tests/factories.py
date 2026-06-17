"""Admin-test helpers (PLAN 15-B9). An admin account is staff + superuser so the same
factory drives both the REST tests (role check) and the Django-admin action tests.
"""

import factory

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory


class AdminFactory(UserFactory):
    email = factory.Sequence(lambda n: f"admin{n}@example.pl")
    role = User.Role.ADMIN
    is_staff = True
    is_superuser = True
