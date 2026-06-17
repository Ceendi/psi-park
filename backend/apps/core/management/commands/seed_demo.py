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
        self._seed_reservations()
        self._seed_payments()
        self._seed_invoices()
        self._seed_reviews()
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
        from pathlib import Path
        from django.core.files import File
        seed_images_dir = Path(__file__).parent / "seed_images"
        dog_images = {
            "Łata": "dog_lata.png",
            "Borys": "dog_borys.png",
        }

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
            dog, _ = Dog.objects.get_or_create(owner=owner, name=name, defaults=defaults)
            if not dog.photo:
                filename = dog_images.get(name)
                if filename:
                    img_path = seed_images_dir / filename
                    if img_path.exists():
                        with img_path.open("rb") as f:
                            dog.photo.save(filename, File(f), save=True)

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

        # Attach default images if they exist
        from django.core.files import File
        from pathlib import Path
        from apps.gardens.models import GardenPhoto

        seed_images_dir = Path(__file__).parent / "seed_images"
        image_mapping = {
            "Ogród z basenem i wiatą na Woli Justowskiej": "garden_pool.png",
            "Zielona oaza pod Kopcem Kościuszki": "garden_oasis.png",
            "Przestronny wybieg w Nowej Hucie": "garden_agility.png",
            "Kameralny ogród na Zabłociu": "garden_urban.png",
        }

        photos_created = 0
        for title, filename in image_mapping.items():
            garden = Garden.objects.filter(title=title).first()
            if garden and not garden.photos.exists():
                img_path = seed_images_dir / filename
                if img_path.exists():
                    with img_path.open("rb") as f:
                        photo = GardenPhoto(garden=garden, position=0)
                        photo.image.save(filename, File(f), save=False)
                        photo.thumbnail.save(f"thumb_{filename}", File(f), save=False)
                        photo.save()
                        photos_created += 1

        if photos_created:
            self.stdout.write(self.style.SUCCESS(f"Attached photos to {photos_created} demo gardens."))

    def _seed_reservations(self) -> None:
        """B4: bookings for the demo client across all panel states (PLAN 14).

        Reuses Katarzyna's dogs and Magda's approved gardens (seeded above). Start times
        are anchored to today at whole hours so re-running the same day is idempotent
        (``get_or_create`` keyed on client+garden+start). Windows are spread across two
        gardens and distinct hours so no two committed bookings overlap (PLAN 7.4.2).
        """
        from datetime import timedelta
        from decimal import ROUND_HALF_UP, Decimal

        from django.utils import timezone

        from apps.dogs.models import Dog
        from apps.gardens.models import Garden
        from apps.reservations.models import Reservation

        user_model = get_user_model()
        try:
            client = user_model.objects.get(email="katarzyna@psipark.local")
        except user_model.DoesNotExist:
            return

        dogs = {dog.name: dog for dog in Dog.objects.filter(owner=client)}
        gardens = list(
            Garden.objects.filter(
                host__email="magda@psipark.local",
                verification_status=Garden.Verification.APPROVED,
            ).order_by("id")
        )
        if not (dogs.get("Łata") and dogs.get("Borys") and len(gardens) >= 2):
            return
        garden_a, garden_b = gardens[0], gardens[1]
        now = timezone.now()

        def at(days: int, hour: int):
            anchor = timezone.localtime(now).replace(hour=hour, minute=0, second=0, microsecond=0)
            return anchor + timedelta(days=days)

        def amounts(garden: Garden):
            subtotal = (garden.price_per_hour * Decimal(2)).quantize(Decimal("0.01"))
            fee = (subtotal * Decimal(10) / Decimal(100)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            return garden.price_per_hour, subtotal, fee, subtotal + fee

        status = Reservation.Status
        # (garden, dog, days, hour, status, paid, decided, cancelled)
        specs = [
            (garden_a, dogs["Łata"], 5, 10, status.CONFIRMED, True, True, False),
            (garden_b, dogs["Borys"], 7, 14, status.AWAITING_HOST, True, False, False),
            (garden_a, dogs["Łata"], -10, 10, status.CONFIRMED, True, True, False),
            (garden_b, dogs["Borys"], -3, 11, status.CANCELLED, True, False, True),
        ]
        created = 0
        for garden, dog, days, hour, state, paid, decided, cancelled in specs:
            start = at(days, hour)
            snapshot, subtotal, fee, total = amounts(garden)
            _, was_created = Reservation.objects.get_or_create(
                client=client,
                garden=garden,
                start_time=start,
                defaults={
                    "dog": dog,
                    "end_time": start + timedelta(hours=2),
                    "status": state,
                    "price_per_hour_snapshot": snapshot,
                    "subtotal": subtotal,
                    "service_fee": fee,
                    "total_price": total,
                    "paid_at": now if paid else None,
                    "decided_at": now if decided else None,
                    "cancelled_at": now if cancelled else None,
                    "message_to_host": "Spokojny pies, lubi aportować.",
                },
            )
            created += int(was_created)
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created {created} demo reservations."))

    def _seed_payments(self) -> None:
        """B5: a Payment for every paid demo reservation (PLAN 14 — "1 opłacona rezerwacja").

        Mirrors the reservation state — still-active bookings get a ``succeeded`` payment,
        the paid-then-cancelled one a ``refunded`` payment. Stripe is never contacted: the
        intent ids are synthetic, enough for the panels and Django Admin to show a coherent
        billing history. The invoice for these is part B6.
        """
        from apps.payments.models import Payment
        from apps.reservations.models import Reservation

        user_model = get_user_model()
        try:
            client = user_model.objects.get(email="katarzyna@psipark.local")
        except user_model.DoesNotExist:
            return

        created = 0
        for reservation in Reservation.objects.filter(client=client, paid_at__isnull=False):
            refunded = reservation.status == Reservation.Status.CANCELLED
            _, was_created = Payment.objects.get_or_create(
                reservation=reservation,
                defaults={
                    "stripe_payment_intent_id": f"pi_seed_{reservation.id}",
                    "amount": reservation.total_price,
                    "currency": "pln",
                    "status": (Payment.Status.REFUNDED if refunded else Payment.Status.SUCCEEDED),
                    "billing_name": client.full_name,
                    "billing_email": client.email,
                    "billing_address": "ul. Floriańska 1",
                    "billing_postal_code": "31-019",
                    "billing_city": "Kraków",
                    "billing_country": "PL",
                    "paid_at": reservation.paid_at,
                    "refunded_at": reservation.cancelled_at if refunded else None,
                },
            )
            created += int(was_created)
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created {created} demo payments."))

    def _seed_invoices(self) -> None:
        """B6: issue a PDF invoice for every fully-paid demo reservation (PLAN 14).

        Mirrors the production webhook (PLAN 10.3): a ``succeeded`` payment yields a
        numbered PDF invoice. Idempotent — ``generate_invoice`` returns the existing
        invoice on a re-run. Renders real PDFs into ``MEDIA_ROOT/invoices/`` (WeasyPrint),
        so the client panel has something to download.
        """
        from apps.invoices.models import Invoice
        from apps.invoices.services import generate_invoice
        from apps.payments.models import Payment

        before = Invoice.objects.count()
        succeeded = Payment.objects.filter(status=Payment.Status.SUCCEEDED).select_related(
            "reservation", "reservation__garden", "reservation__client"
        )
        for payment in succeeded:
            generate_invoice(reservation=payment.reservation)
        created = Invoice.objects.count() - before
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created {created} demo invoices."))

    def _seed_reviews(self) -> None:
        """B7: a review for each completed (confirmed, past) demo reservation (PLAN 14).

        Raises the catalogue rating of the reviewed garden (smoke-test step 7). Idempotent:
        keyed on the reservation (one review per stay) and capped at one review per garden
        (the ``UniqueConstraint`` on author+garden — K-1).
        """
        from django.utils import timezone

        from apps.reservations.models import Reservation
        from apps.reviews.models import Review

        user_model = get_user_model()
        try:
            client = user_model.objects.get(email="katarzyna@psipark.local")
        except user_model.DoesNotExist:
            return

        completed = (
            Reservation.objects.filter(
                client=client,
                status=Reservation.Status.CONFIRMED,
                end_time__lt=timezone.now(),
            )
            .select_related("garden")
            .order_by("end_time")
        )
        created = 0
        reviewed_gardens: set[int] = set()
        for reservation in completed:
            if reservation.garden_id in reviewed_gardens:
                continue
            reviewed_gardens.add(reservation.garden_id)
            _, was_created = Review.objects.get_or_create(
                reservation=reservation,
                defaults={
                    "author": client,
                    "garden": reservation.garden,
                    "rating": 5,
                    "comment": "Cudowny, bezpieczny teren — Łata była zachwycona. Wrócimy!",
                },
            )
            created += int(was_created)
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created {created} demo reviews."))
