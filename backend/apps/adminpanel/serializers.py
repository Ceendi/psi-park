"""Serializers for the admin API (PLAN 6.1 ISP, 8.2 Admin).

Admins need more than the public projections: the garden queue carries the host's contact
details, the user list carries the account's status flags, and the moderation list carries
who wrote which review on which garden. Read shapes reuse the gardens detail serializer
where possible; the only write body is the garden rejection reason.
"""

from rest_framework import serializers

from apps.accounts.models import User
from apps.gardens.models import Garden
from apps.gardens.serializers import GardenDetailSerializer
from apps.reviews.models import Review


class AdminHostSerializer(serializers.ModelSerializer):
    """Host identity for the garden queue — adds contact details over the public card."""

    full_name = serializers.CharField(read_only=True)
    is_verified_host = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "phone", "role", "is_verified_host", "verified_at"]
        read_only_fields = fields


class AdminGardenSerializer(GardenDetailSerializer):
    """Full garden view for moderation: every detail field plus the host's contact block."""

    host = AdminHostSerializer(read_only=True)
    # Meta (all detail fields, read-only) is inherited from GardenDetailSerializer.


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-facing account row: identity, role and the moderation status flags (PLAN 8.2)."""

    full_name = serializers.CharField(read_only=True)
    is_verified_host = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "is_active",
            "is_verified_host",
            "verified_at",
            "marketing_consent",
            "created_at",
        ]
        read_only_fields = fields


class GardenRejectSerializer(serializers.Serializer):
    """Garden rejection body (PLAN 8.2). ``reason`` is required so the host gets feedback."""

    reason = serializers.CharField(max_length=300, allow_blank=False)


class _ReviewGardenSerializer(serializers.ModelSerializer):
    """Minimal garden identity shown next to a moderated review."""

    class Meta:
        model = Garden
        fields = ["id", "title", "city"]
        read_only_fields = fields


class _ReviewAuthorSerializer(serializers.ModelSerializer):
    """Review author identity for moderation (admins see the e-mail, unlike the public card)."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "email"]
        read_only_fields = fields


class AdminReviewSerializer(serializers.ModelSerializer):
    """Review row for moderation: who wrote it, on which garden, plus the content (PLAN 8.2)."""

    author = _ReviewAuthorSerializer(read_only=True)
    garden = _ReviewGardenSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "garden",
            "author",
            "reservation",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
