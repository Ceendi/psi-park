"""Serializers for the reviews API (PLAN 6.1 ISP, 8.2 Recenzje).

Separate read shape (``ReviewSerializer`` — author card + rating + comment, used by the
public garden list, the detail endpoint and the create response) and write shape
(``ReviewWriteSerializer`` — the 1–5 rating + comment, reused for create and partial edit).
The eligible-stay card reuses the reservations app's public ``GardenMiniSerializer``.
"""

from rest_framework import serializers

from apps.accounts.models import User
from apps.reservations.models import Reservation
from apps.reservations.serializers import GardenMiniSerializer
from apps.reviews.models import RATING_MAX, RATING_MIN, Review


class ReviewAuthorSerializer(serializers.ModelSerializer):
    """Public-facing identity of a review's author (shown on the catalogue card)."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name"]
        read_only_fields = fields


class ReviewSerializer(serializers.ModelSerializer):
    """Read shape of a review (PLAN 8.2). ``garden``/``reservation`` serialise as their ids."""

    author = ReviewAuthorSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "garden",
            "reservation",
            "author",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ReviewWriteSerializer(serializers.Serializer):
    """Review input body (PLAN 8.2). Eligibility is enforced in the service, not here."""

    rating = serializers.IntegerField(min_value=RATING_MIN, max_value=RATING_MAX)
    comment = serializers.CharField(required=False, allow_blank=True, default="", max_length=2000)


class EligibleReservationSerializer(serializers.ModelSerializer):
    """A completed stay awaiting a review — the client-panel CTA card (PLAN 8.2)."""

    garden = GardenMiniSerializer(read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "garden", "start_time", "end_time"]
        read_only_fields = fields
