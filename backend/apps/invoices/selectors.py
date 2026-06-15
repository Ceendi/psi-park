"""Read-side queries for invoices (PLAN 5.1, 6.2, B6).

Both invoice endpoints resolve the invoice here, scoped to the requesting client. A foreign
reservation, an unknown id, or a reservation that has no invoice yet (not paid) are all
indistinguishable from one another — every miss is a 404 (privacy, PLAN 11; "brak faktury
przed płatnością" → 404), mirroring the reservations/payments apps.
"""

from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.invoices.models import Invoice


def owned_invoice(*, client: User, reservation_id: int) -> Invoice:
    """The invoice for the client's own reservation, or 404 if absent/foreign.

    Scoped to ``client`` so another user's invoice — or one that does not exist yet — is a
    plain 404. The reservation and garden are joined for the PDF render / metadata response.
    """
    try:
        return Invoice.objects.select_related(
            "reservation", "reservation__client", "reservation__garden"
        ).get(reservation_id=reservation_id, reservation__client=client)
    except Invoice.DoesNotExist as exc:
        raise NotFound("Nie znaleziono faktury.") from exc
