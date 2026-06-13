"""Reusable permission classes.

Role checks gate whole endpoints; ``IsOwner`` gates individual objects. Object-level
ownership is always enforced explicitly (never rely on queryset filtering alone — PLAN 11).
"""

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class _RolePermission(BasePermission):
    role: str = ""

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == self.role)


class IsClient(_RolePermission):
    role = User.Role.CLIENT


class IsHost(_RolePermission):
    role = User.Role.HOST


class IsAdmin(_RolePermission):
    role = User.Role.ADMIN


class IsOwner(BasePermission):
    """Object-level: the request user owns the object.

    Looks for a conventional owner attribute (``owner``, ``user``, ``client`` or
    ``host``); falls back to identity when the object *is* a user.
    """

    owner_fields = ("owner", "user", "client", "host")

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if obj == user:
            return True
        return any(getattr(obj, field, None) == user for field in self.owner_fields)
