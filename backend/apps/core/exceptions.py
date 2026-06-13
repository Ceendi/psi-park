"""Business exceptions and a custom DRF exception handler.

Field-validation errors keep DRF's default shape ``{"field": ["msg"]}``. Every other
APIException is normalised to ``{"detail": "...", "code": "..."}`` so the frontend can
branch on a stable machine-readable ``code`` (PLAN 6.3).
"""

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class BusinessError(APIException):
    """Base class for domain rule violations carrying a stable ``code``."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Żądanie narusza regułę biznesową."
    default_code = "business_error"


class SlotUnavailable(BusinessError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Wybrany termin jest już zajęty."
    default_code = "slot_unavailable"


class InvalidStateTransition(BusinessError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Niedozwolona zmiana statusu rezerwacji."
    default_code = "reservation_state_invalid"


class ReservationExpired(BusinessError):
    status_code = status.HTTP_410_GONE
    default_detail = "Rezerwacja wygasła."
    default_code = "reservation_expired"


class DogVaccinationRequired(BusinessError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Pies musi mieć aktualne szczepienia."
    default_code = "dog_vaccination_required"


class ReviewNotEligible(BusinessError):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Nie możesz wystawić recenzji dla tej rezerwacji."
    default_code = "review_not_eligible"


class ReviewAlreadyExists(BusinessError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Recenzja dla tej rezerwacji już istnieje."
    default_code = "review_already_exists"


class PaymentAlreadyProcessed(BusinessError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Płatność została już przetworzona."
    default_code = "payment_already_processed"


def custom_exception_handler(exc, context):
    """Attach a top-level ``code`` to non-field error responses."""
    response = exception_handler(exc, context)
    if response is None:
        return response

    if (
        isinstance(response.data, dict)
        and "detail" in response.data
        and "code" not in response.data
    ):
        codes = exc.get_codes() if isinstance(exc, APIException) else None
        if isinstance(codes, str):
            response.data["code"] = codes
    return response
