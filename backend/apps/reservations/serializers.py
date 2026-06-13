"""Serializers for the reservations API (PLAN 6.1 ISP, 8.2, 8.3).

Separate shapes for create (input ids), list (light) and detail (full breakdown), plus
the host schedule and stats payloads. The nested garden/dog/client cards are deliberately
small. Action flags are role-aware — computed against the requesting user in context — so
the same row tells a client which buttons to show and a host which decisions are open.
"""

from rest_framework import serializers

from apps.accounts.models import User
from apps.dogs.models import Dog
from apps.gardens.models import Garden
from apps.reservations import services
from apps.reservations.models import Reservation


class GardenMiniSerializer(serializers.ModelSerializer):
    """Compact garden card embedded in a reservation (PLAN 8.3)."""

    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Garden
        fields = ["id", "title", "city", "price_per_hour", "cover_image"]
        read_only_fields = fields

    def get_cover_image(self, obj: Garden) -> str | None:
        photos = list(obj.photos.all())  # prefetched, ordered by position
        if not photos:
            return None
        file = photos[0].thumbnail or photos[0].image
        if not file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class DogMiniSerializer(serializers.ModelSerializer):
    """Compact dog card embedded in a reservation."""

    class Meta:
        model = Dog
        fields = ["id", "name", "breed"]
        read_only_fields = fields


class ClientMiniSerializer(serializers.ModelSerializer):
    """Public-facing client identity shown to the host on a reservation."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name"]
        read_only_fields = fields


class _ActionFlagsMixin(serializers.Serializer):
    """Role-aware booleans driving the panel buttons (computed against ``request.user``)."""

    can_cancel = serializers.SerializerMethodField()
    can_pay = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    can_reject = serializers.SerializerMethodField()
    refund_on_cancel = serializers.SerializerMethodField()

    def _user(self) -> User | None:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return user if (user and user.is_authenticated) else None

    def get_can_cancel(self, obj: Reservation) -> bool:
        user = self._user()
        return bool(user and obj.client_id == user.id and obj.status in services._CANCELLABLE)

    def get_can_pay(self, obj: Reservation) -> bool:
        user = self._user()
        return bool(
            user
            and obj.client_id == user.id
            and obj.status == Reservation.Status.PENDING_PAYMENT
            and not obj.is_expired
        )

    def _is_host_decision_open(self, obj: Reservation) -> bool:
        user = self._user()
        return bool(
            user
            and obj.garden.host_id == user.id
            and obj.status == Reservation.Status.AWAITING_HOST
        )

    def get_can_accept(self, obj: Reservation) -> bool:
        return self._is_host_decision_open(obj)

    def get_can_reject(self, obj: Reservation) -> bool:
        return self._is_host_decision_open(obj)

    def get_refund_on_cancel(self, obj: Reservation) -> bool:
        """Whether cancelling right now would be refunded (the 24h policy, AD-5)."""
        if not self.get_can_cancel(obj):
            return False
        return services._should_refund_on_cancel(reservation=obj)


class ReservationListSerializer(_ActionFlagsMixin, serializers.ModelSerializer):
    """Light row for the client/host panels (PLAN 8.2)."""

    garden = GardenMiniSerializer(read_only=True)
    dog = DogMiniSerializer(read_only=True)
    client = ClientMiniSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "status",
            "status_display",
            "garden",
            "dog",
            "client",
            "dogs_count",
            "start_time",
            "end_time",
            "total_price",
            "created_at",
            "can_cancel",
            "can_pay",
            "can_accept",
            "can_reject",
            "refund_on_cancel",
        ]
        read_only_fields = fields


class ReservationDetailSerializer(ReservationListSerializer):
    """Full reservation view: price breakdown, message and all audit timestamps."""

    class Meta(ReservationListSerializer.Meta):
        fields = [
            *ReservationListSerializer.Meta.fields,
            "price_per_hour_snapshot",
            "subtotal",
            "service_fee",
            "message_to_host",
            "expires_at",
            "paid_at",
            "decided_at",
            "cancelled_at",
            "updated_at",
        ]
        read_only_fields = fields


class ReservationCreateSerializer(serializers.Serializer):
    """Booking request body (PLAN 8.3). Domain validation happens in the service."""

    garden = serializers.IntegerField(min_value=1)
    dog = serializers.IntegerField(min_value=1)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    dogs_count = serializers.IntegerField(min_value=1, default=1)
    message_to_host = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=2000
    )


class ReservationRejectSerializer(serializers.Serializer):
    """Optional rejection reason forwarded to the client e-mail (PLAN 8.2)."""

    reason = serializers.CharField(required=False, allow_blank=True, default="", max_length=300)


class CancelResultSerializer(serializers.Serializer):
    """Cancel response: the refund outcome plus the updated reservation (PLAN 8.2)."""

    refunded = serializers.BooleanField()
    reservation = ReservationDetailSerializer()


class ScheduleEventSerializer(serializers.ModelSerializer):
    """One calendar event in the host schedule (PLAN 8.2)."""

    garden_id = serializers.IntegerField(read_only=True)
    garden_title = serializers.CharField(source="garden.title", read_only=True)
    dog_name = serializers.CharField(source="dog.name", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "garden_id",
            "garden_title",
            "dog_name",
            "client_name",
            "start_time",
            "end_time",
            "status",
            "status_display",
        ]
        read_only_fields = fields


class HostStatsSerializer(serializers.Serializer):
    """Host dashboard tiles (PLAN 8.2)."""

    pending_count = serializers.IntegerField()
    upcoming_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    rating_avg = serializers.FloatField(allow_null=True)
