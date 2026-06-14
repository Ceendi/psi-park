from django.contrib import admin

from apps.payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reservation",
        "amount",
        "currency",
        "status",
        "paid_at",
        "refunded_at",
        "created_at",
    )
    list_filter = ("status", "currency")
    search_fields = (
        "stripe_payment_intent_id",
        "reservation__id",
        "billing_name",
        "billing_email",
    )
    autocomplete_fields = ("reservation",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "stripe_payment_intent_id",
        "amount",
        "paid_at",
        "refunded_at",
    )
