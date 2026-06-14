"""Thin payment views (PLAN 8.2 Płatności).

Three endpoints: the client starts a payment for their own reservation; Stripe posts the
webhook (no JWT — authenticated by signature instead); and the frontend reads the public
publishable key. As everywhere, views only parse/authorise and delegate to ``services``.
"""

from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsClient
from apps.payments import gateway, selectors, services
from apps.payments.serializers import (
    BillingSerializer,
    PaymentIntentResponseSerializer,
    StripeConfigSerializer,
)


class PaymentIntentView(APIView):
    """POST /reservations/{id}/payment-intent/ — start/refresh the client's payment."""

    permission_classes = [IsClient]

    @extend_schema(request=BillingSerializer, responses=PaymentIntentResponseSerializer)
    def post(self, request: Request, pk: int) -> Response:
        serializer = BillingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = selectors.owned_reservation_for_payment(
            client=request.user, reservation_id=pk
        )
        payment, client_secret = services.start_payment(
            reservation=reservation, billing=serializer.validated_data
        )
        payload = {
            "client_secret": client_secret,
            "payment_intent_id": payment.stripe_payment_intent_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        }
        return Response(PaymentIntentResponseSerializer(payload).data)


class StripeWebhookView(APIView):
    """POST /payments/webhook/ — Stripe event sink (PLAN 10.1).

    Public route authenticated by the Stripe signature, not JWT: no auth class (so DRF
    skips SessionAuthentication and therefore CSRF) and no throttling (Stripe may burst).
    The raw request body must be verified before parsing, hence ``request.body``.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description="Event acknowledged.")},
    )
    def post(self, request: Request) -> Response:
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            event = gateway.construct_event(payload=request.body, sig_header=sig_header)
        except gateway.WebhookSignatureError:
            return Response(
                {"detail": "Nieprawidłowy podpis webhooka.", "code": "invalid_signature"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        services.handle_webhook(event=event)
        return Response(status=status.HTTP_200_OK)


class StripeConfigView(APIView):
    """GET /payments/config/ — public Stripe publishable key for the frontend."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=StripeConfigSerializer)
    def get(self, request: Request) -> Response:
        data = {"publishable_key": settings.STRIPE_PUBLISHABLE_KEY}
        return Response(StripeConfigSerializer(data).data)
