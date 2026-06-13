"""Seed demonstration data.

B0 only provisions the administrator account. Later parts (B2 dogs, B3 gardens,
B4 reservations, ...) extend this command with their own factories so a single
``seed_demo`` call yields a coherent demo environment (PLAN 14).
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Create demo data (B0: administrator account)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Reset demo data before seeding (no-op in B0; used by later parts).",
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        self._seed_admin()
        self._seed_dogs()
        self._seed_gardens()
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def _seed_admin(self) -> None:
        user_model = get_user_model()
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@psipark.local")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin12345")

        if user_model.objects.filter(email=email).exists():
            self.stdout.write(f"Admin {email} already exists — skipping.")
            return

        user_model.objects.create_superuser(
            email=email,
            password=password,
            first_name="PsiPark",
            last_name="Admin",
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin {email}."))

    def _seed_dogs(self) -> None:
        """B2: a demo client with the two dogs from the mockups (Łata, Borys).

        The owner is created here because no client is seeded yet; later parts reuse it
        by e-mail. Health dates are spread across statuses to exercise the UI badges.
        """
        from datetime import date
        from decimal import Decimal

        from django.utils import timezone

        from apps.dogs.models import Dog

        user_model = get_user_model()
        owner, created = user_model.objects.get_or_create(
            email="katarzyna@psipark.local",
            defaults={
                "first_name": "Katarzyna",
                "last_name": "Nowak",
                "role": user_model.Role.CLIENT,
                "terms_accepted_at": timezone.now(),
            },
        )
        if created:
            owner.set_password("klient12345")
            owner.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(f"Created demo client {owner.email}."))

        dogs = {
            "Łata": {
                "breed": "Border Collie",
                "sex": Dog.Sex.FEMALE,
                "is_sterilized": True,
                "weight_kg": Decimal("18.0"),
                "birth_date": date(2021, 5, 10),
                "vaccinations_valid_until": date(2027, 1, 15),
                "deworming_valid_until": date(2026, 9, 1),
                "notes": "Energiczna, uwielbia aportować.",
            },
            "Borys": {
                "breed": "Labrador retriever",
                "sex": Dog.Sex.MALE,
                "is_sterilized": False,
                "weight_kg": Decimal("32.0"),
                "birth_date": date(2019, 3, 20),
                "vaccinations_valid_until": date(2026, 7, 1),
                "deworming_valid_until": date(2026, 6, 1),
                "notes": "Spokojny, lubi pływać.",
            },
        }
        for name, defaults in dogs.items():
            Dog.objects.get_or_create(owner=owner, name=name, defaults=defaults)

    def _seed_gardens(self) -> None:
        """B3: demo hosts (incl. "Magda Krawczyk") and their Kraków gardens (PLAN 14).

        Mostly approved + active gardens for the public catalogue, plus one ``pending``
        (admin verification queue) and one ``rejected``. Gardens are seeded without
        photos — same convention as the dogs seed; real photos are uploaded via the API.
        """
        from datetime import time
        from decimal import Decimal

        from django.utils import timezone

        from apps.gardens.models import Garden

        user_model = get_user_model()

        hosts = {
            "magda@psipark.local": {
                "first_name": "Magda",
                "last_name": "Krawczyk",
                "verified": True,
            },
            "tomasz@psipark.local": {
                "first_name": "Tomasz",
                "last_name": "Wójcik",
                "verified": True,
            },
            "anna@psipark.local": {
                "first_name": "Anna",
                "last_name": "Lewandowska",
                "verified": False,
            },
        }
        host_objects: dict[str, object] = {}
        for email, info in hosts.items():
            host, created = user_model.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": info["first_name"],
                    "last_name": info["last_name"],
                    "role": user_model.Role.HOST,
                    "terms_accepted_at": timezone.now(),
                    "verified_at": timezone.now() if info["verified"] else None,
                },
            )
            if created:
                host.set_password("gospodarz12345")
                host.save(update_fields=["password"])
                self.stdout.write(self.style.SUCCESS(f"Created demo host {host.email}."))
            host_objects[email] = host

        approved = Garden.Verification.APPROVED
        pending = Garden.Verification.PENDING
        rejected = Garden.Verification.REJECTED
        gardens = [
            {
                "host": host_objects["magda@psipark.local"],
                "title": "Ogród z basenem i wiatą na Woli Justowskiej",
                "city": "Kraków",
                "address": "Wola Justowska",
                "latitude": Decimal("50.063500"),
                "longitude": Decimal("19.887000"),
                "area_m2": 800,
                "surface_type": "grass",
                "fence_height_m": Decimal("1.8"),
                "max_dogs": 3,
                "price_per_hour": Decimal("45.00"),
                "amenities": ["pool", "water", "shelter", "shade", "fenced_secure"],
                "rules": ["Sprzątaj po pupilu.", "Jeden opiekun na wizytę."],
                "verification_status": approved,
            },
            {
                "host": host_objects["magda@psipark.local"],
                "title": "Zielona oaza pod Kopcem Kościuszki",
                "city": "Kraków",
                "address": "ul. Świętej Bronisławy",
                "latitude": Decimal("50.054800"),
                "longitude": Decimal("19.887000"),
                "area_m2": 450,
                "surface_type": "mixed",
                "fence_height_m": Decimal("1.6"),
                "max_dogs": 2,
                "price_per_hour": Decimal("38.00"),
                "amenities": ["water", "bench", "bin", "shade"],
                "rules": ["Psy agresywne tylko w kagańcu."],
                "verification_status": approved,
            },
            {
                "host": host_objects["tomasz@psipark.local"],
                "title": "Przestronny wybieg w Nowej Hucie",
                "city": "Kraków",
                "address": "os. Zielone",
                "latitude": Decimal("50.070000"),
                "longitude": Decimal("20.037000"),
                "area_m2": 1200,
                "surface_type": "grass",
                "fence_height_m": Decimal("2.0"),
                "max_dogs": 4,
                "price_per_hour": Decimal("50.00"),
                "amenities": ["agility", "water", "parking", "lighting", "fenced_secure"],
                "rules": ["Tor agility na własną odpowiedzialność."],
                "verification_status": approved,
            },
            {
                "host": host_objects["tomasz@psipark.local"],
                "title": "Kameralny ogród na Zabłociu",
                "city": "Kraków",
                "address": "ul. Zabłocie",
                "latitude": Decimal("50.048000"),
                "longitude": Decimal("19.962000"),
                "area_m2": 300,
                "surface_type": "paved",
                "fence_height_m": Decimal("1.5"),
                "max_dogs": 1,
                "price_per_hour": Decimal("30.00"),
                "amenities": ["water", "bin"],
                "rules": [],
                "verification_status": approved,
            },
            {
                "host": host_objects["anna@psipark.local"],
                "title": "Leśna polana przy Lesie Wolskim",
                "city": "Kraków",
                "address": "Las Wolski",
                "latitude": Decimal("50.056000"),
                "longitude": Decimal("19.845000"),
                "area_m2": 1500,
                "surface_type": "grass",
                "fence_height_m": Decimal("1.8"),
                "max_dogs": 5,
                "price_per_hour": Decimal("42.00"),
                "amenities": ["water", "shade", "shelter"],
                "rules": ["Zbieraj odchody."],
                "verification_status": pending,
            },
            {
                "host": host_objects["anna@psipark.local"],
                "title": "Ogród z agility w Bronowicach",
                "city": "Kraków",
                "address": "ul. Bronowicka",
                "latitude": Decimal("50.085000"),
                "longitude": Decimal("19.890000"),
                "area_m2": 600,
                "surface_type": "sand",
                "fence_height_m": Decimal("1.4"),
                "max_dogs": 2,
                "price_per_hour": Decimal("35.00"),
                "amenities": ["agility", "water"],
                "rules": [],
                "verification_status": rejected,
                "rejection_reason": "Zdjęcia nie potwierdzają wysokości ogrodzenia.",
            },
        ]
        created_count = 0
        for entry in gardens:
            host = entry.pop("host")
            title = entry.pop("title")
            entry.setdefault("open_from", time(8, 0))
            entry.setdefault("open_to", time(20, 0))
            _, created = Garden.objects.get_or_create(host=host, title=title, defaults=entry)
            created_count += int(created)
        if created_count:
            self.stdout.write(self.style.SUCCESS(f"Created {created_count} demo gardens."))
