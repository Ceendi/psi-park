"""Read-side queries for dogs (PLAN 5.1, 6.2).

Ownership is scoped here rather than via a blanket queryset filter on a shared list:
``owned_dogs`` returns only the caller's dogs, so a foreign id resolves to 404 (privacy)
while still enforcing ownership explicitly (PLAN 11).
"""

from django.db.models import QuerySet

from apps.accounts.models import User
from apps.dogs.models import Dog


def owned_dogs(*, owner: User) -> QuerySet[Dog]:
    """Return the dogs belonging to ``owner`` (ordered by the model's default)."""
    return Dog.objects.filter(owner=owner)
