from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ConnectionRequestActionView,
    ConnectionRequestCreateView,
    ConnectionStateListView,
    IdeaSubmissionView,
    IncomingConnectionRequestListView,
    LegacyLibraryView,
    MyProjectsView,
    ProjectDetailView,
    ProjectLeaveView,
    ProjectRemoveMemberView,
    ProjectJoinRequestActionView,
    ProjectJoinRequestCreateView,
    ProfileUpsertView,
    PublicProfileView,
    ProjectCreateListView,
    RegisterView,
    TeammateMatchView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profiles/<int:user_id>/", PublicProfileView.as_view(), name="public-profile"),
    path("profile/", ProfileUpsertView.as_view(), name="profile"),
    path("projects/", ProjectCreateListView.as_view(), name="project-list-create"),
    path("projects/mine/", MyProjectsView.as_view(), name="my-projects"),
    path("projects/<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<int:project_id>/leave/", ProjectLeaveView.as_view(), name="project-leave"),
    path("projects/<int:project_id>/members/<int:user_id>/remove/", ProjectRemoveMemberView.as_view(), name="project-remove-member"),
    path("projects/<int:project_id>/join-request/", ProjectJoinRequestCreateView.as_view(), name="project-join-request"),
    path("project-join-requests/<int:pk>/action/", ProjectJoinRequestActionView.as_view(), name="project-join-request-action"),
    path("legacy-library/", LegacyLibraryView.as_view(), name="legacy-library"),
    path("connections/send/", ConnectionRequestCreateView.as_view(), name="connection-send"),
    path("connections/incoming/", IncomingConnectionRequestListView.as_view(), name="connection-incoming"),
    path("connections/status/", ConnectionStateListView.as_view(), name="connection-status"),
    path("connections/<int:pk>/action/", ConnectionRequestActionView.as_view(), name="connection-action"),
    path("matches/", TeammateMatchView.as_view(), name="teammate-matches"),
    path("ideas/submit/", IdeaSubmissionView.as_view(), name="idea-submit"),
]
