"""Payment routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``.

The ``payment-intent`` action hangs off ``/reservations/{id}/`` but belongs to B5 — the
reservations app left that sub-route to this part. The webhook path must stay
``/payments/webhook/`` (the ``stripe-cli`` container forwards there, PLAN 13.1).
"""

from django.urls import path

from apps.payments.views import PaymentIntentView, StripeConfigView, StripeWebhookView

urlpatterns = [
    path(
        "reservations/<int:pk>/payment-intent/",
        PaymentIntentView.as_view(),
        name="payment-intent",
    ),
    path("payments/webhook/", StripeWebhookView.as_view(), name="payment-webhook"),
    path("payments/config/", StripeConfigView.as_view(), name="payment-config"),
]
