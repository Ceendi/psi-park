from rest_framework.exceptions import ValidationError

from apps.core.exceptions import SlotUnavailable, custom_exception_handler


def test_business_error_gets_code_and_status():
    response = custom_exception_handler(SlotUnavailable(), {})

    assert response.status_code == 409
    assert response.data == {
        "detail": "Wybrany termin jest już zajęty.",
        "code": "slot_unavailable",
    }


def test_field_validation_error_keeps_default_shape():
    response = custom_exception_handler(ValidationError({"email": ["To pole jest wymagane."]}), {})

    assert response.status_code == 400
    assert "email" in response.data
    assert "code" not in response.data


def test_unhandled_exception_returns_none():
    assert custom_exception_handler(ValueError("boom"), {}) is None
