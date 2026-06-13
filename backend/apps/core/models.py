from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base adding audit timestamps to every concrete model (PLAN K-9)."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
