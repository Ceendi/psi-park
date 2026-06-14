"""Payment factory, reused across the payment tests (PLAN 15-B5).

Defaults to a pending payment of 99 zł linked to a fresh reservation; tests override
``status``/``reservation`` for the succeeded/refunded cases.
"""

from decimal import Decimal

import factory

from apps.payments.models import Payment
from apps.reservations.tests.factories import ReservationFactory


class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    reservation = factory.SubFactory(ReservationFactory)
    stripe_payment_intent_id = factory.Sequence(lambda n: f"pi_test_{n}")
    amount = Decimal("99.00")
    currency = "pln"
    status = Payment.Status.PENDING
    billing_name = "Katarzyna Nowak"
    billing_email = "katarzyna@example.pl"
    billing_address = "ul. Polna 1"
    billing_postal_code = "30-001"
    billing_city = "Kraków"
    billing_country = "PL"
