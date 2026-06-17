"""Django-admin moderation actions (PLAN 15-B9, AD-12).

The owning apps already register every model with sensible ``list_display`` /
``search_fields`` / ``list_filter``. This app — loaded last in ``INSTALLED_APPS`` — augments
the Garden and User admins with the moderation *actions* (approve/reject, verify/block/
unblock) that route through ``adminpanel.services``, so Django Admin and the REST API share
one code path.

It does **not** edit the other apps' ``admin.py`` (CLAUDE.md §2): it re-registers a subclass
that inherits their configuration and only adds the actions. Importing the base admin modules
here guarantees the models are registered before we unregister them, regardless of autodiscover
order. Reviews need no custom action — the built-in "delete selected" is the moderation tool.
"""

from django.contrib import admin

from apps.accounts.admin import UserAdmin as BaseUserAdmin
from apps.accounts.models import User
from apps.adminpanel import services
from apps.gardens.admin import GardenAdmin as BaseGardenAdmin
from apps.gardens.models import Garden

# A generic note attached when a garden is rejected in bulk (the API takes a real reason).
_BULK_REJECT_REASON = "Ogłoszenie wymaga poprawek przed publikacją — skontaktuj się z obsługą."

admin.site.unregister(Garden)
admin.site.unregister(User)


@admin.register(Garden)
class GardenAdmin(BaseGardenAdmin):
    """Garden admin from B3 plus the verification actions (each routes through services)."""

    actions = ["approve_gardens", "reject_gardens"]

    @admin.action(description="Zatwierdź wybrane ogrody (e-mail do gospodarza)")
    def approve_gardens(self, request, queryset):
        for garden in queryset:
            services.approve_garden(garden_id=garden.id)
        self.message_user(request, f"Zatwierdzono ogrody: {queryset.count()}.")

    @admin.action(description="Odrzuć wybrane ogrody (e-mail do gospodarza)")
    def reject_gardens(self, request, queryset):
        for garden in queryset:
            services.reject_garden(garden_id=garden.id, reason=_BULK_REJECT_REASON)
        self.message_user(request, f"Odrzucono ogrody: {queryset.count()}.")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """User admin from B1 plus the host-verification and block/unblock actions."""

    actions = ["verify_hosts", "block_users", "unblock_users"]

    @admin.action(description="Zweryfikuj wybranych gospodarzy")
    def verify_hosts(self, request, queryset):
        count = 0
        for user in queryset.filter(role=User.Role.HOST):
            services.verify_host(user_id=user.id)
            count += 1
        self.message_user(request, f"Zweryfikowano gospodarzy: {count}.")

    @admin.action(description="Zablokuj wybranych użytkowników")
    def block_users(self, request, queryset):
        count = 0
        for user in queryset.exclude(role=User.Role.ADMIN):
            services.block_user(user_id=user.id)
            count += 1
        self.message_user(request, f"Zablokowano użytkowników: {count}.")

    @admin.action(description="Odblokuj wybranych użytkowników")
    def unblock_users(self, request, queryset):
        for user in queryset:
            services.unblock_user(user_id=user.id)
        self.message_user(request, f"Odblokowano użytkowników: {queryset.count()}.")
