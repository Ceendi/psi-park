"""Admin-panel routes (PLAN 8.2 Admin). Mounted under ``/api/v1/`` by ``config.urls``.

These live under ``/api/v1/admin/…`` (the REST panel for F8) and never collide with Django's
own ``/admin/`` site, which ``config.urls`` mounts at the project root.
"""

from django.urls import path

from apps.adminpanel.views import (
    AdminGardenApproveView,
    AdminGardenListView,
    AdminGardenRejectView,
    AdminReviewDeleteView,
    AdminReviewListView,
    AdminUserBlockView,
    AdminUserListView,
    AdminUserUnblockView,
    AdminUserVerifyView,
)

urlpatterns = [
    path("admin/gardens/", AdminGardenListView.as_view(), name="admin-garden-list"),
    path(
        "admin/gardens/<int:pk>/approve/",
        AdminGardenApproveView.as_view(),
        name="admin-garden-approve",
    ),
    path(
        "admin/gardens/<int:pk>/reject/",
        AdminGardenRejectView.as_view(),
        name="admin-garden-reject",
    ),
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/verify/", AdminUserVerifyView.as_view(), name="admin-user-verify"),
    path("admin/users/<int:pk>/block/", AdminUserBlockView.as_view(), name="admin-user-block"),
    path(
        "admin/users/<int:pk>/unblock/",
        AdminUserUnblockView.as_view(),
        name="admin-user-unblock",
    ),
    path("admin/reviews/", AdminReviewListView.as_view(), name="admin-review-list"),
    path("admin/reviews/<int:pk>/", AdminReviewDeleteView.as_view(), name="admin-review-delete"),
]
