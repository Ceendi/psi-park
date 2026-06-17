"""API contract tests for the admin panel (PLAN 8.2 Admin).

Every endpoint walks the auth matrix: the admin succeeds, anonymous is 401, the wrong role
(client/host) is 403, and unknown ids are 404. Plus the behavioural promises from the B9
DoD: approve → public garden + e-mail, reject → reason + e-mail, verify → badge, block →
login impossible. List endpoints carry a query-budget test (PLAN 6.4 / 12).
"""

import pytest
from django.core import mail
from django.urls import reverse

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.adminpanel.tests.factories import AdminFactory
from apps.gardens.models import Garden
from apps.gardens.tests.factories import GardenFactory, GardenPhotoFactory
from apps.reviews.models import Review
from apps.reviews.tests.factories import ReviewFactory

pytestmark = pytest.mark.django_db

GARDENS_URL = reverse("admin-garden-list")
USERS_URL = reverse("admin-user-list")
REVIEWS_URL = reverse("admin-review-list")
LOGIN_URL = reverse("auth-login")


def _approve_url(garden_id: int) -> str:
    return reverse("admin-garden-approve", args=[garden_id])


def _reject_url(garden_id: int) -> str:
    return reverse("admin-garden-reject", args=[garden_id])


def _verify_url(user_id: int) -> str:
    return reverse("admin-user-verify", args=[user_id])


def _block_url(user_id: int) -> str:
    return reverse("admin-user-block", args=[user_id])


def _unblock_url(user_id: int) -> str:
    return reverse("admin-user-unblock", args=[user_id])


def _review_url(review_id: int) -> str:
    return reverse("admin-review-delete", args=[review_id])


# --- gardens queue: GET /admin/gardens/ -----------------------------------------------


def test_gardens_queue_lists_for_admin(auth_admin, pending_garden):
    client, _ = auth_admin
    body = client.get(GARDENS_URL).json()
    assert body["count"] == 1
    assert body["results"][0]["id"] == pending_garden.id
    # Admin queue carries the host contact block, not just the public card.
    assert body["results"][0]["host"]["email"] == pending_garden.host.email


def test_gardens_queue_status_filter(auth_admin, host_user):
    client, _ = auth_admin
    GardenFactory(host=host_user, verification_status=Garden.Verification.PENDING)
    GardenFactory(host=host_user, verification_status=Garden.Verification.APPROVED)

    body = client.get(GARDENS_URL, {"status": "pending"}).json()
    assert body["count"] == 1
    assert body["results"][0]["verification_status"] == "pending"


def test_gardens_queue_requires_auth(api_client):
    assert api_client.get(GARDENS_URL).status_code == 401


@pytest.mark.parametrize("role_fixture", ["auth_client", "auth_host"])
def test_gardens_queue_forbidden_for_non_admin(request, role_fixture):
    client, _ = request.getfixturevalue(role_fixture)
    assert client.get(GARDENS_URL).status_code == 403


def test_gardens_queue_query_budget(auth_admin, host_user, django_assert_max_num_queries):
    client, _ = auth_admin
    for _ in range(3):
        garden = GardenFactory(host=host_user, verification_status=Garden.Verification.PENDING)
        GardenPhotoFactory(garden=garden, position=0)
    with django_assert_max_num_queries(8):
        assert client.get(GARDENS_URL).status_code == 200


# --- approve: POST /admin/gardens/{id}/approve/ ---------------------------------------


def test_approve_makes_garden_public_and_emails(auth_admin, pending_garden):
    client, _ = auth_admin
    response = client.post(_approve_url(pending_garden.id))

    assert response.status_code == 200
    assert response.json()["verification_status"] == "approved"
    pending_garden.refresh_from_db()
    assert pending_garden.is_public is True
    assert len(mail.outbox) == 1


def test_approve_requires_auth(api_client, pending_garden):
    assert api_client.post(_approve_url(pending_garden.id)).status_code == 401


@pytest.mark.parametrize("role_fixture", ["auth_client", "auth_host"])
def test_approve_forbidden_for_non_admin(request, role_fixture, pending_garden):
    client, _ = request.getfixturevalue(role_fixture)
    assert client.post(_approve_url(pending_garden.id)).status_code == 403
    pending_garden.refresh_from_db()
    assert pending_garden.verification_status == Garden.Verification.PENDING


def test_approve_unknown_garden_returns_404(auth_admin):
    client, _ = auth_admin
    assert client.post(_approve_url(999_999)).status_code == 404


# --- reject: POST /admin/gardens/{id}/reject/ -----------------------------------------


def test_reject_stores_reason_and_emails(auth_admin, pending_garden):
    client, _ = auth_admin
    response = client.post(
        _reject_url(pending_garden.id), {"reason": "Zdjęcia nie pokazują ogrodzenia."}, "json"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "rejected"
    assert body["rejection_reason"] == "Zdjęcia nie pokazują ogrodzenia."
    pending_garden.refresh_from_db()
    assert pending_garden.is_public is False
    assert len(mail.outbox) == 1


@pytest.mark.parametrize("payload", [{}, {"reason": ""}])
def test_reject_requires_reason(auth_admin, pending_garden, payload):
    client, _ = auth_admin
    response = client.post(_reject_url(pending_garden.id), payload, "json")
    assert response.status_code == 400
    assert "reason" in response.json()


def test_reject_requires_auth(api_client, pending_garden):
    response = api_client.post(_reject_url(pending_garden.id), {"reason": "x"}, "json")
    assert response.status_code == 401


def test_reject_forbidden_for_client(auth_client, pending_garden):
    client, _ = auth_client
    response = client.post(_reject_url(pending_garden.id), {"reason": "x"}, "json")
    assert response.status_code == 403


# --- users list: GET /admin/users/ ----------------------------------------------------


def test_users_list_for_admin(auth_admin, host_user, client_user):
    client, admin = auth_admin
    body = client.get(USERS_URL).json()
    ids = {row["id"] for row in body["results"]}
    assert {admin.id, host_user.id, client_user.id} <= ids


def test_users_list_role_filter(auth_admin, host_user, client_user):
    client, _ = auth_admin
    body = client.get(USERS_URL, {"role": "host"}).json()
    assert all(row["role"] == "host" for row in body["results"])
    assert host_user.id in {row["id"] for row in body["results"]}
    assert client_user.id not in {row["id"] for row in body["results"]}


def test_users_list_search_by_email(auth_admin, client_user):
    client, _ = auth_admin
    body = client.get(USERS_URL, {"search": client_user.email}).json()
    assert body["count"] == 1
    assert body["results"][0]["id"] == client_user.id


def test_users_list_requires_auth(api_client):
    assert api_client.get(USERS_URL).status_code == 401


def test_users_list_forbidden_for_host(auth_host):
    client, _ = auth_host
    assert client.get(USERS_URL).status_code == 403


def test_users_list_query_budget(auth_admin, django_assert_max_num_queries):
    client, _ = auth_admin
    UserFactory.create_batch(5)
    with django_assert_max_num_queries(4):
        assert client.get(USERS_URL).status_code == 200


# --- verify host: POST /admin/users/{id}/verify/ --------------------------------------


def test_verify_host_sets_badge(auth_admin, host_user):
    client, _ = auth_admin
    response = client.post(_verify_url(host_user.id))

    assert response.status_code == 200
    body = response.json()
    assert body["is_verified_host"] is True
    assert body["verified_at"] is not None
    host_user.refresh_from_db()
    assert host_user.verified_at is not None
    assert len(mail.outbox) == 1


def test_verify_non_host_returns_400(auth_admin, client_user):
    client, _ = auth_admin
    response = client.post(_verify_url(client_user.id))
    assert response.status_code == 400
    assert response.json()["code"] == "host_role_required"
    client_user.refresh_from_db()
    assert client_user.verified_at is None


def test_verify_requires_auth(api_client, host_user):
    assert api_client.post(_verify_url(host_user.id)).status_code == 401


def test_verify_forbidden_for_client(auth_client, host_user):
    client, _ = auth_client
    assert client.post(_verify_url(host_user.id)).status_code == 403


def test_verify_unknown_user_returns_404(auth_admin):
    client, _ = auth_admin
    assert client.post(_verify_url(999_999)).status_code == 404


# --- block / unblock: POST /admin/users/{id}/(un)block/ -------------------------------


def test_block_prevents_login(auth_admin, api_client):
    """The DoD's headline: a blocked account can no longer obtain tokens (PLAN 15-B9)."""
    client, _ = auth_admin
    victim = UserFactory(role=User.Role.CLIENT)
    # Sanity: the account can log in before being blocked.
    ok = api_client.post(LOGIN_URL, {"email": victim.email, "password": "pass12345"}, "json")
    assert ok.status_code == 200

    response = client.post(_block_url(victim.id))
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    blocked = api_client.post(LOGIN_URL, {"email": victim.email, "password": "pass12345"}, "json")
    assert blocked.status_code == 401


def test_unblock_reactivates(auth_admin):
    client, _ = auth_admin
    victim = UserFactory(role=User.Role.CLIENT, is_active=False)
    response = client.post(_unblock_url(victim.id))
    assert response.status_code == 200
    assert response.json()["is_active"] is True


def test_block_admin_returns_400(auth_admin):
    client, _ = auth_admin
    other_admin = AdminFactory()
    response = client.post(_block_url(other_admin.id))
    assert response.status_code == 400
    assert response.json()["code"] == "cannot_block_admin"
    other_admin.refresh_from_db()
    assert other_admin.is_active is True


def test_block_requires_auth(api_client, client_user):
    assert api_client.post(_block_url(client_user.id)).status_code == 401


def test_block_forbidden_for_host(auth_host, client_user):
    client, _ = auth_host
    assert client.post(_block_url(client_user.id)).status_code == 403
    client_user.refresh_from_db()
    assert client_user.is_active is True


# --- reviews moderation: GET + DELETE /admin/reviews/ ---------------------------------


def test_reviews_list_for_admin(auth_admin):
    client, _ = auth_admin
    review = ReviewFactory(comment="Naruszający regulamin tekst.")
    body = client.get(REVIEWS_URL).json()

    assert body["count"] == 1
    row = body["results"][0]
    assert row["id"] == review.id
    assert row["garden"]["title"] == review.garden.title
    assert row["author"]["email"] == review.author.email


def test_reviews_list_garden_filter(auth_admin):
    client, _ = auth_admin
    target = ReviewFactory()
    ReviewFactory()
    body = client.get(REVIEWS_URL, {"garden": target.garden_id}).json()
    assert body["count"] == 1
    assert body["results"][0]["id"] == target.id


def test_reviews_list_requires_auth(api_client):
    assert api_client.get(REVIEWS_URL).status_code == 401


def test_reviews_list_forbidden_for_client(auth_client):
    client, _ = auth_client
    assert client.get(REVIEWS_URL).status_code == 403


def test_reviews_list_query_budget(auth_admin, django_assert_max_num_queries):
    client, _ = auth_admin
    ReviewFactory.create_batch(4)
    with django_assert_max_num_queries(4):
        assert client.get(REVIEWS_URL).status_code == 200


def test_delete_review_removes_it(auth_admin):
    client, _ = auth_admin
    review = ReviewFactory()
    response = client.delete(_review_url(review.id))
    assert response.status_code == 204
    assert not Review.objects.filter(id=review.id).exists()


def test_delete_review_requires_auth(api_client):
    review = ReviewFactory()
    assert api_client.delete(_review_url(review.id)).status_code == 401
    assert Review.objects.filter(id=review.id).exists()


def test_delete_review_forbidden_for_host(auth_host):
    client, _ = auth_host
    review = ReviewFactory()
    assert client.delete(_review_url(review.id)).status_code == 403
    assert Review.objects.filter(id=review.id).exists()


def test_delete_unknown_review_returns_404(auth_admin):
    client, _ = auth_admin
    assert client.delete(_review_url(999_999)).status_code == 404
