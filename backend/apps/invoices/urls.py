"""Invoice routes (PLAN 8.2). Mounted under ``/api/v1/`` by ``config.urls``.

Both actions hang off ``/reservations/{id}/`` — the reservations app left these invoice
sub-routes to B6 (see ``reservations/urls.py``). The two paths have distinct suffixes
(``/invoice/`` vs ``/invoice/pdf/``) so their order does not matter.
"""

from django.urls import path

from apps.invoices.views import InvoiceMetadataView, InvoicePdfView

urlpatterns = [
    path(
        "reservations/<int:pk>/invoice/",
        InvoiceMetadataView.as_view(),
        name="invoice-detail",
    ),
    path(
        "reservations/<int:pk>/invoice/pdf/",
        InvoicePdfView.as_view(),
        name="invoice-pdf",
    ),
]
