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
