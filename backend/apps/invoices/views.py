"""Thin invoice views (PLAN 8.2 Faktury).

Two owner-only reads hanging off ``/reservations/{id}/``: the invoice metadata and the PDF
download (``Content-Disposition: attachment``). Both require the client role and resolve the
invoice through the client-scoped selector, so a host gets 403 and a foreigner 404. The PDF
is streamed from the media volume — it is never exposed as a public media URL (PLAN 11).
"""

from django.http import FileResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsClient
from apps.invoices import selectors
from apps.invoices.serializers import InvoiceSerializer


class InvoiceMetadataView(APIView):
    """GET /reservations/{id}/invoice/ — invoice metadata for the owning client."""

    permission_classes = [IsClient]

    @extend_schema(responses=InvoiceSerializer)
    def get(self, request: Request, pk: int) -> Response:
        invoice = selectors.owned_invoice(client=request.user, reservation_id=pk)
        return Response(InvoiceSerializer(invoice, context={"request": request}).data)


class InvoicePdfView(APIView):
    """GET /reservations/{id}/invoice/pdf/ — download the PDF (attachment, owner only)."""

    permission_classes = [IsClient]

    @extend_schema(responses={(200, "application/pdf"): OpenApiTypes.BINARY})
    def get(self, request: Request, pk: int) -> FileResponse:
        invoice = selectors.owned_invoice(client=request.user, reservation_id=pk)
        return FileResponse(
            invoice.pdf.open("rb"),
            as_attachment=True,
            filename=_download_name(invoice.number),
            content_type="application/pdf",
        )


def _download_name(number: str) -> str:
    """Download file name — ``PSI/2026/06/0001`` → ``faktura-PSI_2026_06_0001.pdf``.

    Slashes become ``_`` (same convention as the e-mail attachment helper, PLAN B10).
    """
    return f"faktura-{number.replace('/', '_')}.pdf"
