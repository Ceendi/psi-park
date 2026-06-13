"""Cancel unpaid reservations past their payment TTL (PLAN AD-11).

There is no Celery/cron in the stack, so expiry is resolved lazily in queries; this
command is the manual/scheduled sweep that turns elapsed ``pending_payment`` holds into
``cancelled`` rows. Safe to run repeatedly (idempotent — only stale holds match).
"""

from django.core.management.base import BaseCommand

from apps.reservations.services import expire_pending_reservations


class Command(BaseCommand):
    help = "Cancel unpaid reservations whose payment window has elapsed (PLAN AD-11)."

    def handle(self, *args, **options) -> None:
        count = expire_pending_reservations()
        self.stdout.write(self.style.SUCCESS(f"Expired {count} reservation(s)."))
