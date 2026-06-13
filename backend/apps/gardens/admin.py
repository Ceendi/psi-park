from django.contrib import admin

from apps.gardens.models import Garden, GardenPhoto


class GardenPhotoInline(admin.TabularInline):
    model = GardenPhoto
    extra = 0
    fields = ("position", "image", "thumbnail")
    readonly_fields = ("thumbnail",)


@admin.register(Garden)
class GardenAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "host",
        "city",
        "price_per_hour",
        "verification_status",
        "is_active",
        "created_at",
    )
    list_filter = ("verification_status", "is_active", "surface_type", "city")
    search_fields = ("title", "city", "address", "host__email")
    autocomplete_fields = ("host",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [GardenPhotoInline]


@admin.register(GardenPhoto)
class GardenPhotoAdmin(admin.ModelAdmin):
    list_display = ("garden", "position", "created_at")
    search_fields = ("garden__title",)
    readonly_fields = ("created_at", "updated_at")
