import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

from apps.accounts.models import User
from apps.core.permissions import IsAdmin, IsClient, IsHost, IsOwner

pytestmark = pytest.mark.django_db


def _request(user):
    request = APIRequestFactory().get("/")
    request.user = user
    return request


@pytest.fixture
def client_user():
    return User.objects.create_user(
        email="client@x.pl", password="pass12345", role=User.Role.CLIENT
    )


@pytest.fixture
def host_user():
    return User.objects.create_user(email="host@x.pl", password="pass12345", role=User.Role.HOST)


def test_is_client_allows_only_clients(client_user, host_user):
    assert IsClient().has_permission(_request(client_user), None) is True
    assert IsClient().has_permission(_request(host_user), None) is False


def test_is_host_and_is_admin(host_user):
    admin = User.objects.create_superuser(email="a@x.pl", password="pass12345")
    assert IsHost().has_permission(_request(host_user), None) is True
    assert IsAdmin().has_permission(_request(admin), None) is True
    assert IsAdmin().has_permission(_request(host_user), None) is False


def test_unauthenticated_is_denied():
    assert IsClient().has_permission(_request(AnonymousUser()), None) is False


def test_is_owner_identity_and_attribute(client_user, host_user):
    assert IsOwner().has_object_permission(_request(client_user), None, client_user) is True
    assert IsOwner().has_object_permission(_request(host_user), None, client_user) is False

    obj = type("Obj", (), {"owner": client_user})()
    assert IsOwner().has_object_permission(_request(client_user), None, obj) is True
    assert IsOwner().has_object_permission(_request(host_user), None, obj) is False
