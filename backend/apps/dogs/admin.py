from django.contrib import admin

from apps.dogs.models import Dog


@admin.register(Dog)
class DogAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "breed",
        "sex",
        "is_sterilized",
        "vaccinations_valid_until",
        "deworming_valid_until",
        "created_at",
    )
    list_filter = ("sex", "is_sterilized")
    search_fields = ("name", "breed", "owner__email")
    autocomplete_fields = ("owner",)
    readonly_fields = ("created_at", "updated_at")
