"""Filtering for the admin lists (PLAN 8.2 Admin).

Each filter maps to a single SQL predicate so the lists keep their query budget (PLAN 12).
``status`` is the verification-queue selector from the contract (``?status=pending``).
"""

import django_filters as filters

from apps.accounts.models import User
from apps.gardens.models import Garden
from apps.reviews.models import Review


class AdminGardenFilter(filters.FilterSet):
    status = filters.ChoiceFilter(
        field_name="verification_status", choices=Garden.Verification.choices
    )
    city = filters.CharFilter(field_name="city", lookup_expr="icontains")

    class Meta:
        model = Garden
        fields = ["city"]


class AdminUserFilter(filters.FilterSet):
    role = filters.ChoiceFilter(choices=User.Role.choices)
    is_active = filters.BooleanFilter()

    class Meta:
        model = User
        fields = ["role", "is_active"]


class AdminReviewFilter(filters.FilterSet):
    garden = filters.NumberFilter(field_name="garden_id")
    rating = filters.NumberFilter(field_name="rating")

    class Meta:
        model = Review
        fields = ["garden", "rating"]
