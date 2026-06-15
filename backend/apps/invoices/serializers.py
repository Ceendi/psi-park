"""Serializers for the invoices API (PLAN 6.1 ISP, 8.2 Faktury).

The metadata serializer documents the small JSON shape the client panel reads (number,
issue date, amount) plus ``pdf_url`` — an absolute link to the authenticated download
endpoint, never the raw media path (the file is owner-gated, PLAN 11).
"""

from rest_framework import serializers
from rest_framework.reverse import reverse

from apps.invoices.models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice metadata returned by ``GET /reservations/{id}/invoice/`` (PLAN 8.2)."""

    reservation = serializers.IntegerField(source="reservation_id", read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ["id", "number", "issued_at", "total_gross", "reservation", "pdf_url"]
        read_only_fields = fields

    def get_pdf_url(self, obj: Invoice) -> str:
        """Absolute URL of the PDF download endpoint for this invoice's reservation."""
        return reverse(
            "invoice-pdf", args=[obj.reservation_id], request=self.context.get("request")
        )
