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
