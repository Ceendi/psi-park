"""Catalogue filtering for the public garden list (PLAN 8.2, 12).

Every filter maps to a single SQL predicate so the list endpoint keeps its query budget
(PLAN 12). ``date`` is accepted and validated but does not yet exclude collisions:
reservation data is owned by B4 and per-row collision checks would blow the budget, so
per-slot availability is surfaced by the availability endpoint instead (see README).
"""

import django_filters as filters

from apps.gardens.models import Garden, SurfaceType


class GardenFilter(filters.FilterSet):
    city = filters.CharFilter(field_name="city", lookup_expr="icontains")
    min_price = filters.NumberFilter(field_name="price_per_hour", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price_per_hour", lookup_expr="lte")
    min_area = filters.NumberFilter(field_name="area_m2", lookup_expr="gte")
    # "I have N dogs" → gardens that allow at least N.
    max_dogs = filters.NumberFilter(field_name="max_dogs", lookup_expr="gte")
    surface_type = filters.ChoiceFilter(choices=SurfaceType.choices)
    amenities = filters.CharFilter(method="filter_amenities")
    # Opening-hours coverage of a desired booking window.
    time_from = filters.TimeFilter(field_name="open_from", lookup_expr="lte")
    time_to = filters.TimeFilter(field_name="open_to", lookup_expr="gte")
    date = filters.DateFilter(method="filter_date")
    in_bbox = filters.CharFilter(method="filter_in_bbox")

    class Meta:
        model = Garden
        fields = ["city", "surface_type", "max_dogs"]

    def filter_amenities(self, queryset, name, value):
        """CSV of amenity codes; keep gardens whose amenity list contains all of them."""
        codes = [code.strip() for code in value.split(",") if code.strip()]
        if codes:
            queryset = queryset.filter(amenities__contains=codes)
        return queryset

    def filter_date(self, queryset, name, value):
        """Accept and validate the requested date; opening-hours scoping is done by time_*."""
        return queryset

    def filter_in_bbox(self, queryset, name, value):
        """Map viewport ``minLng,minLat,maxLng,maxLat`` → coordinate range filter."""
        try:
            min_lng, min_lat, max_lng, max_lat = (float(part) for part in value.split(","))
        except (ValueError, TypeError):
            return queryset
        return queryset.filter(
            longitude__gte=min_lng,
            longitude__lte=max_lng,
            latitude__gte=min_lat,
            latitude__lte=max_lat,
        )
