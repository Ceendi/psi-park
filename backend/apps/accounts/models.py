from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from apps.accounts.managers import UserManager
from apps.core.models import TimeStampedModel


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Account with a single role chosen at registration (PLAN 2.2, 7.1)."""

    class Role(models.TextChoices):
        CLIENT = "client", "Klient"
        HOST = "host", "Gospodarz"
        ADMIN = "admin", "Administrator"

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=60, blank=True)
    last_name = models.CharField(max_length=60, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CLIENT, db_index=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    # Host verification by an admin (PLAN 7.1 / K-10).
    verified_at = models.DateTimeField(null=True, blank=True)
    # GDPR consents captured at registration (PLAN 11).
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    marketing_consent = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_client(self) -> bool:
        return self.role == self.Role.CLIENT

    @property
    def is_host(self) -> bool:
        return self.role == self.Role.HOST

    @property
    def is_verified_host(self) -> bool:
        return self.is_host and self.verified_at is not None
