"""Garden-specific permissions (PLAN 11, 15-B3)."""

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsHostOfGarden(BasePermission):
    """Object-level: the request user is the host who owns the garden.

    Paired with ``IsHost`` (role gate) on the view. Ownership is still also scoped in the
    selector queryset — this is the explicit object check PLAN 11 requires on top of it.
    """

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == User.Role.HOST)

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.host_id == request.user.id
