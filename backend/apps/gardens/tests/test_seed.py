import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.gardens.models import Garden

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_hosts_and_gardens():
    call_command("seed_demo")

    magda = User.objects.get(email="magda@psipark.local")
    assert magda.is_host
    assert magda.is_verified_host  # verified_at set

    gardens = Garden.objects.all()
    assert gardens.count() == 6
    public = gardens.filter(verification_status=Garden.Verification.APPROVED, is_active=True)
    assert public.count() == 4
    assert gardens.filter(verification_status=Garden.Verification.PENDING).count() == 1  # queue
    assert gardens.filter(verification_status=Garden.Verification.REJECTED).count() == 1
    assert all(g.city == "Kraków" for g in gardens)


def test_seed_demo_gardens_are_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")

    assert Garden.objects.count() == 6
    assert User.objects.filter(email="magda@psipark.local").count() == 1
