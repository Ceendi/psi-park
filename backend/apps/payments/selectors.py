"""Read-side queries for payments (PLAN 5.1, 6.2, B5).

Views resolve ownership here before handing a reservation to ``services.start_payment``;
a foreign or unknown id resolves to 404 (privacy, PLAN 11), mirroring the reservations app.
"""

from rest_framework.exceptions import NotFound

from apps.accounts.models import User
from apps.reservations.models import Reservation


def owned_reservation_for_payment(*, client: User, reservation_id: int) -> Reservation:
    """The client's own reservation by id, for starting/refreshing its payment.

    Scoped to ``client`` so another user's reservation is indistinguishable from a missing
    one (404, PLAN 11). The state guard (must still be payable) lives in the service.
    """
    try:
        return Reservation.objects.select_related("garden", "client").get(
            id=reservation_id, client=client
        )
    except Reservation.DoesNotExist as exc:
        raise NotFound("Nie znaleziono rezerwacji.") from exc
