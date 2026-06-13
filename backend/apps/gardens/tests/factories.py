"""Garden factories, reused by the seed and by later parts that need gardens (PLAN 15-B3)."""

from datetime import time
from decimal import Decimal

import factory

from apps.accounts.tests.factories import HostFactory
from apps.gardens.models import Garden, GardenPhoto, SurfaceType


class GardenFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Garden

    host = factory.SubFactory(HostFactory)
    title = factory.Sequence(lambda n: f"Ogród testowy {n}")
    description = "Przestronny, ogrodzony teren dla psów."
    city = "Kraków"
    address = factory.Sequence(lambda n: f"ul. Testowa {n}")
    latitude = Decimal("50.061400")
    longitude = Decimal("19.936600")
    area_m2 = 500
    surface_type = SurfaceType.GRASS
    is_fenced = True
    fence_height_m = Decimal("1.8")
    max_dogs = 2
    price_per_hour = Decimal("45.00")
    open_from = time(8, 0)
    open_to = time(20, 0)
    min_booking_hours = 1
    amenities = factory.LazyFunction(lambda: ["water", "shade"])
    rules = factory.LazyFunction(lambda: ["Sprzątaj po pupilu."])
    # Default to a publicly visible listing; tests that need other states override these.
    verification_status = Garden.Verification.APPROVED
    is_active = True


class GardenPhotoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = GardenPhoto

    garden = factory.SubFactory(GardenFactory)
    image = factory.django.ImageField(color="green", format="JPEG")
    thumbnail = factory.django.ImageField(color="green", format="JPEG")
    position = factory.Sequence(lambda n: n)
