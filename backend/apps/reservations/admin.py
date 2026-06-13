from django.contrib import admin

from apps.reservations.models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "garden",
        "client",
        "dog",
        "start_time",
        "end_time",
        "status",
        "total_price",
        "created_at",
    )
    list_filter = ("status", "start_time")
    search_fields = ("garden__title", "client__email", "dog__name")
    autocomplete_fields = ("garden", "client", "dog")
    date_hierarchy = "start_time"
    readonly_fields = (
        "created_at",
        "updated_at",
        "paid_at",
        "decided_at",
        "cancelled_at",
        "expires_at",
        "price_per_hour_snapshot",
        "subtotal",
        "service_fee",
        "total_price",
    )
