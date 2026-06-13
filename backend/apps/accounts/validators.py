"""Field validators reused across account serializers."""

import re

from rest_framework import serializers

# Polish mobile number: 9 digits, optionally prefixed with +48 (PLAN 7.1).
_PL_PHONE_RE = re.compile(r"^(?:\+48)?\d{9}$")


def validate_pl_phone(value: str) -> str:
    """Normalise and validate a Polish phone number; blank is allowed (optional field).

    Raises:
        serializers.ValidationError: when the number is not 9 digits (optionally +48).
    """
    if not value:
        return value
    normalized = value.replace(" ", "").replace("-", "")
    if not _PL_PHONE_RE.match(normalized):
        raise serializers.ValidationError(
            "Podaj poprawny numer telefonu: 9 cyfr, opcjonalnie z prefiksem +48."
        )
    return normalized
