"""Service-layer tests for reviews (PLAN 15-B7).

Covers the eligibility rule (only an owned, finished ``confirmed`` stay is reviewable; one
review per garden), the owner edit/delete operations, and the two database backstops
(``UniqueConstraint(author, garden)`` and the 1–5 ``CheckConstraint``). The rating's effect
on the catalogue is proven against ``gardens.selectors`` (no denormalisation — PLAN 15-B7).
"""

from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.core.exceptions import ReviewAlreadyExists, ReviewNotEligible
from apps.reservations.models import Reservation
from apps.reservations.tests.factories import ReservationFactory
from apps.reviews import services
from apps.reviews.models import Review
from apps.reviews.tests.conftest import make_completed_reservation

pytestmark = pytest.mark.django_db

_Status = Reservation.Status


# --- create: happy path ---------------------------------------------------------------


def test_create_review_for_completed_stay(client_user, garden, completed_reservation):
    review = services.create_review(
        client=client_user, reservation_id=completed_reservation.id, rating=5, comment="Super!"
    )

    assert review.author == client_user
    assert review.garden == garden
    assert review.reservation == completed_reservation
    assert review.rating == 5
    assert review.comment == "Super!"


def test_create_review_defaults_comment_to_blank(client_user, completed_reservation):
    review = services.create_review(
        client=client_user, reservation_id=completed_reservation.id, rating=4
    )
    assert review.comment == ""


# --- create: eligibility --------------------------------------------------------------


def test_create_review_rejects_awaiting_host(client_user, garden):
    reservation = ReservationFactory(
        client=client_user, garden=garden, status=_Status.AWAITING_HOST, paid_at=timezone.now()
    )
    with pytest.raises(ReviewNotEligible):
        services.create_review(client=client_user, reservation_id=reservation.id, rating=5)


def test_create_review_rejects_future_confirmed(client_user, garden):
    start = timezone.now() + timedelta(days=2)
    reservation = ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CONFIRMED,
        start_time=start,
        end_time=start + timedelta(hours=2),
        paid_at=timezone.now(),
    )
    with pytest.raises(ReviewNotEligible):
        services.create_review(client=client_user, reservation_id=reservation.id, rating=5)


def test_create_review_rejects_cancelled(client_user, garden):
    end = timezone.now() - timedelta(hours=5)
    reservation = ReservationFactory(
        client=client_user,
        garden=garden,
        status=_Status.CANCELLED,
        start_time=end - timedelta(hours=2),
        end_time=end,
        cancelled_at=timezone.now(),
    )
    with pytest.raises(ReviewNotEligible):
        services.create_review(client=client_user, reservation_id=reservation.id, rating=5)


def test_create_review_foreign_reservation_raises_not_found(other_client, completed_reservation):
    """Reviewing someone else's stay is indistinguishable from a missing one (404)."""
    with pytest.raises(NotFound):
        services.create_review(
            client=other_client, reservation_id=completed_reservation.id, rating=5
        )


# --- create: already exists -----------------------------------------------------------


def test_create_review_twice_for_same_stay_conflicts(client_user, completed_reservation):
    services.create_review(client=client_user, reservation_id=completed_reservation.id, rating=5)
    with pytest.raises(ReviewAlreadyExists):
        services.create_review(
            client=client_user, reservation_id=completed_reservation.id, rating=4
        )


def test_create_review_second_stay_same_garden_conflicts(client_user, garden):
    """One review per garden (K-1): a second completed stay there is still a conflict."""
    first = make_completed_reservation(client=client_user, garden=garden, hours_ago=48)
    second = make_completed_reservation(client=client_user, garden=garden, hours_ago=120)

    services.create_review(client=client_user, reservation_id=first.id, rating=5)
    with pytest.raises(ReviewAlreadyExists):
        services.create_review(client=client_user, reservation_id=second.id, rating=3)


# --- update / delete ------------------------------------------------------------------


def test_update_review_changes_rating_and_comment(review):
    updated = services.update_review(review=review, data={"rating": 2, "comment": "Słabo."})
    review.refresh_from_db()
    assert updated.rating == 2
    assert review.rating == 2
    assert review.comment == "Słabo."


def test_update_review_partial_keeps_other_field(review):
    original_rating = review.rating
    services.update_review(review=review, data={"comment": "Dopisek."})
    review.refresh_from_db()
    assert review.comment == "Dopisek."
    assert review.rating == original_rating


def test_delete_review_removes_it(review):
    review_id = review.id
    services.delete_review(review=review)
    assert not Review.objects.filter(id=review_id).exists()


# --- effect on the garden rating (PLAN 15-B7: annotated, not denormalised) ------------


def test_review_feeds_garden_rating_aggregate(client_user, garden, completed_reservation):
    from apps.gardens import selectors as garden_selectors

    services.create_review(client=client_user, reservation_id=completed_reservation.id, rating=4)

    row = garden_selectors.public_garden_list().get(pk=garden.pk)
    assert float(row.rating_avg) == pytest.approx(4.0)
    assert row.rating_count == 1


# --- database backstops ---------------------------------------------------------------


def test_unique_author_garden_constraint(review):
    """The DB rejects a second review by the same author for the same garden (K-1)."""
    other_stay = make_completed_reservation(
        client=review.author, garden=review.garden, hours_ago=200
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        Review.objects.create(
            author=review.author, garden=review.garden, reservation=other_stay, rating=3
        )


@pytest.mark.parametrize("rating", [0, 6])
def test_rating_check_constraint(client_user, completed_reservation, rating):
    """The DB rejects a rating outside 1–5."""
    with pytest.raises(IntegrityError), transaction.atomic():
        Review.objects.create(
            author=client_user,
            garden=completed_reservation.garden,
            reservation=completed_reservation,
            rating=rating,
        )
