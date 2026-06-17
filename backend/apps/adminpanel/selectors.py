"""Read-side queries for the admin panel (PLAN 5.1, 6.2, 15-B9).

Thin wrappers over the gardens/reviews read layers so the moderation lists reuse the same
annotated, N+1-free querysets the rest of the app uses (no denormalisation, PLAN 12).
Request-level narrowing (status, role, garden, free-text search) is layered on top by the
view's filter backends.
"""

from django.db.models import QuerySet

from apps.accounts.models import User
from apps.gardens import selectors as garden_selectors
from apps.gardens.models import Garden
from apps.reviews import selectors as review_selectors
from apps.reviews.models import Review


def admin_gardens(*, admin: User) -> QuerySet[Garden]:
    """Every garden, annotated for the card (host + gallery + ratings), oldest first.

    Reuses ``gardens.selectors.visible_gardens`` — an admin sees all statuses — so the
    moderation queue and the public catalogue share one query shape (PLAN 12). Oldest first
    gives the verification queue FIFO order.
    """
    return garden_selectors.visible_gardens(user=admin).order_by("created_at")


def admin_users() -> QuerySet[User]:
    """All accounts, newest first (the view's filters narrow by role/active/search)."""
    return User.objects.all()


def admin_reviews() -> QuerySet[Review]:
    """All reviews with author/garden joined, newest first (moderation list, PLAN 8.2)."""
    return review_selectors.review_detail_qs()
