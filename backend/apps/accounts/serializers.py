"""Serializers for the accounts API.

Separate serializers for input vs. output and per use case (ISP — PLAN 6.1): writes
never expose read-only profile fields and reads never accept passwords. Field-level
validation errors keep DRF's ``{"field": ["msg"]}`` shape (PLAN 6.3).
"""

from django.contrib.auth import password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import User
from apps.accounts.validators import validate_pl_phone


class UserSerializer(serializers.ModelSerializer):
    """Public shape of the logged-in user returned by ``/me/`` and auth responses."""

    full_name = serializers.CharField(read_only=True)
    is_verified_host = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "is_verified_host",
            "verified_at",
            "terms_accepted_at",
            "marketing_consent",
            "created_at",
        ]
        read_only_fields = fields


class AuthTokensSerializer(serializers.Serializer):
    """Response shape for register/login: token pair plus the user profile."""

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)


class DetailSerializer(serializers.Serializer):
    """Generic ``{"detail": "..."}`` response."""

    detail = serializers.CharField(read_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    """Validate a new client/host account (role limited, terms required, password confirmed)."""

    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})
    terms_accepted = serializers.BooleanField(write_only=True)
    # Registration may only create client or host accounts; admins are seeded (PLAN 2.2).
    role = serializers.ChoiceField(choices=[User.Role.CLIENT, User.Role.HOST])

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "marketing_consent",
            "password",
            "password_confirm",
            "terms_accepted",
        ]
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
        }

    def validate_phone(self, value: str) -> str:
        return validate_pl_phone(value)

    def validate_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value

    def validate_terms_accepted(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("Akceptacja regulaminu jest wymagana.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Hasła nie są takie same."})
        return attrs


class LoginSerializer(TokenObtainPairSerializer):
    """E-mail + password login; embeds the user profile and a ``role`` claim in the token."""

    @classmethod
    def get_token(cls, user: User):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class MeUpdateSerializer(serializers.ModelSerializer):
    """Editable profile fields (PATCH /me/). ``role``/``email`` are intentionally excluded."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "marketing_consent"]
        extra_kwargs = {
            "first_name": {"allow_blank": False},
            "last_name": {"allow_blank": False},
        }

    def validate_phone(self, value: str) -> str:
        return validate_pl_phone(value)


class PasswordChangeSerializer(serializers.Serializer):
    """Change password while authenticated (old + new + confirmation)."""

    old_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_old_password(self, value: str) -> str:
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Aktualne hasło jest nieprawidłowe.")
        return value

    def validate_new_password(self, value: str) -> str:
        password_validation.validate_password(value, self.context["request"].user)
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Hasła nie są takie same."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a reset link for an e-mail address."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Set a new password using the token from the reset e-mail."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_new_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Hasła nie są takie same."})
        return attrs


class LogoutSerializer(serializers.Serializer):
    """Refresh token to blacklist on logout."""

    refresh = serializers.CharField(write_only=True)
