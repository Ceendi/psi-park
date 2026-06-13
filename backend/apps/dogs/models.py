from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


def _pl_plural(n: int, one: str, few: str, many: str) -> str:
    """Pick the Polish plural form for ``n`` (1 → one, 2-4 → few, otherwise many)."""
    if n == 1:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


class Dog(TimeStampedModel):
    """A client's dog profile (PLAN 7.2).

    Health-status thresholds live in ``dogs.services`` (PLAN 7.2); this model only
    exposes ``age_label`` as plain calendar arithmetic over ``birth_date``.
    """

    class Sex(models.TextChoices):
        MALE = "male", "Samiec"
        FEMALE = "female", "Suka"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dogs",
    )
    name = models.CharField(max_length=60)
    breed = models.CharField(max_length=80, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    sex = models.CharField(max_length=6, choices=Sex.choices, blank=True)
    is_sterilized = models.BooleanField(default=False)
    vaccinations_valid_until = models.DateField(null=True, blank=True)
    deworming_valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to="dogs/%Y/%m/", null=True, blank=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return self.name

    @property
    def age_label(self) -> str | None:
        """Human-readable age in Polish (e.g. ``"3 lata"``); ``None`` when unknown."""
        birth_date = self.birth_date
        if birth_date is None:
            return None
        today = timezone.localdate()
        if birth_date > today:
            return None
        years = (
            today.year
            - birth_date.year
            - ((today.month, today.day) < (birth_date.month, birth_date.day))
        )
        if years >= 1:
            return f"{years} {_pl_plural(years, 'rok', 'lata', 'lat')}"
        months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
        if today.day < birth_date.day:
            months -= 1
        if months <= 0:
            return "poniżej miesiąca"
        return f"{months} {_pl_plural(months, 'miesiąc', 'miesiące', 'miesięcy')}"
