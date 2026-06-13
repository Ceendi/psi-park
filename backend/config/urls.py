"""Root URL configuration.

Every domain app exposes its routes under ``/api/v1/``. New parts (B1–B10) add their
own ``include(...)`` line below — append, never reorder existing entries (CLAUDE.md §3).
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # --- API v1 ---
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.dogs.urls")),
    # B3+ plug their app routers here, e.g. path("api/v1/", include("apps.gardens.urls")),
    # --- OpenAPI schema ---
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
]

if settings.DEBUG:
    urlpatterns += [
        path(
            "api/v1/docs/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
