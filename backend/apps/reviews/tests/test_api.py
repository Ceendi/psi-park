"""API contract tests for reviews (PLAN 8.2 Recenzje).

Walks the full auth matrix for each endpoint: the owning client succeeds, an anonymous
request is 401, the wrong role is 403, a foreign id is 404, and the business rules surface
their canonical ``code`` (``review_not_eligible`` / ``review_already_exists``, PLAN 6.3).
Also proves a posted review feeds the public garden rating and the eligible-stay feed.
"""

import pytest
from django.urls import reverse

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.gardens.tests.factories import GardenPhotoFactory
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory
from apps.reviews.models import Review
from apps.reviews.tests.conftest import make_completed_reservation
from apps.reviews.tests.factories import ReviewFactory

pytestmark = pytest.mark.django_db

_Status = Reservation.Status


def _create_url(reservation_id: int) -> str:
    return reverse("reservation-review", args=[reservation_id])


def _detail_url(review_id: int) -> str:
    return reverse("review-detail", args=[review_id])


def _garden_reviews_url(garden_id: int) -> str:
    return reverse("garden-reviews", args=[garden_id])


ELIGIBLE_URL = reverse("review-eligible")
GARDEN_DETAIL = "garden-detail"


# --- create: POST /reservations/{id}/review/ ------------------------------------------


def test_create_review_happy(auth_client, garden, completed_reservation):
    client, user = auth_client
    response = client.post(
        _create_url(completed_reservation.id), {"rating": 5, "comment": "Super teren!"}, "json"
    )

    assert response.status_code == 201
    body = response.json()
    assert body["rating"] == 5
    assert body["comment"] == "Super teren!"
    assert body["garden"] == garden.id
    assert body["reservation"] == completed_reservation.id
    assert body["author"]["id"] == user.id
    assert body["author"]["full_name"] == user.full_name
    assert Review.objects.filter(reservation=completed_reservation).count() == 1


def test_create_review_requires_auth(api_client, completed_reservation):
    response = api_client.post(_create_url(completed_reservation.id), {"rating": 5}, "json")
    assert response.status_code == 401


def test_create_review_forbidden_for_host(auth_host, completed_reservation):
    client, _ = auth_host
    response = client.post(_create_url(completed_reservation.id), {"rating": 5}, "json")
    assert response.status_code == 403


def test_create_review_not_eligible(auth_client, garden):
    client, user = auth_client
    reservation = ReservationFactory(client=user, garden=garden, status=_Status.AWAITING_HOST)
    response = client.post(_create_url(reservation.id), {"rating": 5}, "json")

    assert response.status_code == 403
    assert response.json()["code"] == "review_not_eligible"


def test_create_review_already_exists(auth_client, completed_reservation):
    client, _ = auth_client
    first = client.post(_create_url(completed_reservation.id), {"rating": 5}, "json")
    assert first.status_code == 201

    response = client.post(_create_url(completed_reservation.id), {"rating": 4}, "json")
    assert response.status_code == 409
    assert response.json()["code"] == "review_already_exists"


def test_create_review_foreign_reservation_returns_404(
    api_client, other_client, completed_reservation
):
    api_client.force_authenticate(user=other_client)
    response = api_client.post(_create_url(completed_reservation.id), {"rating": 5}, "json")
    assert response.status_code == 404


@pytest.mark.parametrize("rating", [0, 6, "x"])
def test_create_review_invalid_rating_returns_400(auth_client, completed_reservation, rating):
    client, _ = auth_client
    response = client.post(_create_url(completed_reservation.id), {"rating": rating}, "json")
    assert response.status_code == 400
    assert "rating" in response.json()


# --- detail: GET /reviews/{id}/ (public) ----------------------------------------------


def test_review_detail_is_public(api_client, review):
    body = api_client.get(_detail_url(review.id)).json()
    assert body["id"] == review.id
    assert body["rating"] == review.rating
    assert body["author"]["full_name"] == review.author.full_name


def test_review_detail_unknown_returns_404(api_client):
    assert api_client.get(_detail_url(999_999)).status_code == 404


# --- update: PATCH /reviews/{id}/ -----------------------------------------------------


def test_update_own_review(auth_client, review):
    client, _ = auth_client
    response = client.patch(
        _detail_url(review.id), {"rating": 2, "comment": "Jednak słabo."}, "json"
    )

    assert response.status_code == 200
    assert response.json()["rating"] == 2
    review.refresh_from_db()
    assert review.rating == 2
    assert review.comment == "Jednak słabo."


def test_update_review_requires_auth(api_client, review):
    assert api_client.patch(_detail_url(review.id), {"rating": 1}, "json").status_code == 401


def test_update_review_forbidden_for_host(auth_host, review):
    client, _ = auth_host
    assert client.patch(_detail_url(review.id), {"rating": 1}, "json").status_code == 403


def test_update_foreign_review_returns_404(api_client, other_client, review):
    api_client.force_authenticate(user=other_client)
    assert api_client.patch(_detail_url(review.id), {"rating": 1}, "json").status_code == 404


def test_update_review_invalid_rating_returns_400(auth_client, review):
    client, _ = auth_client
    assert client.patch(_detail_url(review.id), {"rating": 9}, "json").status_code == 400


# --- delete: DELETE /reviews/{id}/ ----------------------------------------------------


def test_delete_own_review(auth_client, review):
    client, _ = auth_client
    response = client.delete(_detail_url(review.id))
    assert response.status_code == 204
    assert not Review.objects.filter(id=review.id).exists()


def test_delete_review_requires_auth(api_client, review):
    assert api_client.delete(_detail_url(review.id)).status_code == 401


def test_delete_foreign_review_returns_404(api_client, other_client, review):
    api_client.force_authenticate(user=other_client)
    assert api_client.delete(_detail_url(review.id)).status_code == 404
    assert Review.objects.filter(id=review.id).exists()


# --- eligible: GET /reviews/eligible/ -------------------------------------------------


def test_eligible_lists_completed_unreviewed_stays(auth_client, garden, completed_reservation):
    client, _ = auth_client
    body = client.get(ELIGIBLE_URL).json()
    assert body["count"] == 1
    assert body["results"][0]["id"] == completed_reservation.id
    assert body["results"][0]["garden"]["id"] == garden.id


def test_eligible_excludes_reviewed_garden(auth_client, review):
    """Once the garden is reviewed its completed stay drops off the feed (K-1)."""
    client, _ = auth_client
    assert client.get(ELIGIBLE_URL).json()["count"] == 0


def test_eligible_excludes_non_completed(auth_client, garden):
    client, user = auth_client
    ReservationFactory(client=user, garden=garden, status=_Status.AWAITING_HOST)
    assert client.get(ELIGIBLE_URL).json()["count"] == 0


def test_eligible_forbidden_for_host(auth_host):
    client, _ = auth_host
    assert client.get(ELIGIBLE_URL).status_code == 403


def test_eligible_requires_auth(api_client):
    assert api_client.get(ELIGIBLE_URL).status_code == 401


def test_eligible_query_budget(auth_client, garden, django_assert_max_num_queries):
    client, user = auth_client
    GardenPhotoFactory(garden=garden, position=0)
    # Several non-overlapping completed stays in the garden — none reviewed, so all eligible.
    for hours_ago in (48, 120, 200):
        make_completed_reservation(client=user, garden=garden, hours_ago=hours_ago)
    with django_assert_max_num_queries(6):
        assert client.get(ELIGIBLE_URL).status_code == 200


# --- garden reviews: GET /gardens/{id}/reviews/ (public) ------------------------------


def test_garden_reviews_public_list(api_client, garden, completed_reservation):
    review = ReviewFactory(
        author=completed_reservation.client,
        garden=garden,
        reservation=completed_reservation,
        rating=4,
        comment="Polecam.",
    )
    body = api_client.get(_garden_reviews_url(garden.id)).json()

    assert body["count"] == 1
    assert body["results"][0]["id"] == review.id
    assert body["results"][0]["rating"] == 4
    assert body["results"][0]["author"]["full_name"] == completed_reservation.client.full_name


def test_garden_reviews_empty_for_unknown_garden(api_client):
    body = api_client.get(_garden_reviews_url(999_999)).json()
    assert body["count"] == 0


def test_garden_reviews_query_budget(api_client, garden, django_assert_max_num_queries):
    # Distinct authors (one review per author+garden, K-1) leaving reviews on one garden.
    for hours_ago in (48, 120, 200):
        author = UserFactory(role=User.Role.CLIENT)
        stay = make_completed_reservation(client=author, garden=garden, hours_ago=hours_ago)
        ReviewFactory(author=author, garden=garden, reservation=stay)
    with django_assert_max_num_queries(4):
        assert api_client.get(_garden_reviews_url(garden.id)).status_code == 200


# --- catalogue integration: a review raises the garden's rating ------------------------


def test_posted_review_appears_in_garden_rating(auth_client, garden, completed_reservation):
    client, _ = auth_client
    client.post(_create_url(completed_reservation.id), {"rating": 5}, "json")

    body = client.get(reverse(GARDEN_DETAIL, args=[garden.id])).json()
    assert body["rating_avg"] == 5.0
    assert body["rating_count"] == 1
