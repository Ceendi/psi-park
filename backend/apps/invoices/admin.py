from django.contrib import admin

from apps.invoices.models import Invoice, InvoiceSequence


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "reservation", "total_gross", "issued_at", "created_at")
    search_fields = ("number", "reservation__id", "reservation__client__email")
    autocomplete_fields = ("reservation",)
    # An invoice is an immutable accounting document — read-only in the admin (PLAN 11).
    readonly_fields = (
        "reservation",
        "number",
        "pdf",
        "issued_at",
        "total_gross",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(InvoiceSequence)
class InvoiceSequenceAdmin(admin.ModelAdmin):
    list_display = ("year", "month", "last_number", "updated_at")
    list_filter = ("year", "month")
    readonly_fields = ("created_at", "updated_at")
