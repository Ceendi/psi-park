from django.contrib import admin

from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "garden", "author", "rating", "reservation", "created_at")
    list_filter = ("rating",)
    search_fields = ("garden__title", "author__email", "comment")
    autocomplete_fields = ("garden", "author", "reservation")
    readonly_fields = ("created_at", "updated_at")
