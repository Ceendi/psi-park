from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Page-number pagination used across all list endpoints (PLAN 8.1)."""

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50
