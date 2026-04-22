from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import generics, parsers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .idea_evaluator import evaluate_idea
from .matching import match_users
from .models import ConnectionRequest, MatchScore, Profile, Project, ProjectJoinRequest, Team
from .serializers import (
    ConnectionRequestActionSerializer,
    ConnectionRequestSerializer,
    ConnectionStateSerializer,
    IdeaSubmissionSerializer,
    MatchScoreSerializer,
    ProjectJoinRequestActionSerializer,
    ProjectJoinRequestSerializer,
    ProfileSerializer,
    PublicProfileSerializer,
    ProjectSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class ProfileUpsertView(generics.RetrieveUpdateAPIView, generics.CreateAPIView):
    serializer_class = ProfileSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "experience_level": "beginner",
                "preferred_role": "other",
            },
        )
        return profile

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(self.get_serializer(profile).data, status=status.HTTP_201_CREATED)


class ProjectCreateListView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    queryset = Project.objects.select_related("created_by").prefetch_related("team__members", "join_requests").all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        # Project creators are always part of their own team from day one.
        project = serializer.save(created_by=self.request.user)
        team, _ = Team.objects.get_or_create(project=project)
        team.members.add(self.request.user)


class LegacyLibraryView(generics.ListAPIView):
    serializer_class = ProjectSerializer
    queryset = Project.objects.select_related("created_by").prefetch_related("team__members", "join_requests").all()
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class MyProjectsView(generics.ListAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        # My Projects includes projects the user owns and projects they joined.
        return Project.objects.select_related("created_by").prefetch_related("team__members", "join_requests").filter(
            models.Q(created_by=self.request.user) | models.Q(team__members=self.request.user)
        ).distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    queryset = Project.objects.select_related("created_by").prefetch_related("team__members", "join_requests").all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def update(self, request, *args, **kwargs):
        # Project details can be changed only by the owner.
        project = self.get_object()
        if project.created_by != request.user:
            return Response({"detail": "Only the project owner can edit this project."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if project.created_by != request.user:
            return Response({"detail": "Only the project owner can delete this project."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class ProjectRemoveMemberView(APIView):
    def post(self, request, project_id, user_id):
        # Owners can remove teammates, but ownership itself must stay stable.
        project = Project.objects.select_related("created_by").filter(pk=project_id).first()
        if not project:
            return Response({"detail": "Project does not exist."}, status=status.HTTP_404_NOT_FOUND)
        if project.created_by != request.user:
            return Response({"detail": "Only the project owner can remove teammates."}, status=status.HTTP_403_FORBIDDEN)
        if project.created_by_id == user_id:
            return Response({"detail": "Project owner cannot be removed."}, status=status.HTTP_400_BAD_REQUEST)

        team, _ = Team.objects.get_or_create(project=project)
        member = User.objects.filter(pk=user_id).first()
        if not member or not team.members.filter(id=user_id).exists():
            return Response({"detail": "That teammate is not on this project."}, status=status.HTTP_404_NOT_FOUND)

        team.members.remove(member)
        return Response({"detail": "Teammate removed."}, status=status.HTTP_200_OK)


class ProjectLeaveView(APIView):
    def post(self, request, project_id):
        # Joined teammates can leave; owners should delete or transfer the project instead.
        project = Project.objects.select_related("created_by").filter(pk=project_id).first()
        if not project:
            return Response({"detail": "Project does not exist."}, status=status.HTTP_404_NOT_FOUND)
        if project.created_by == request.user:
            return Response({"detail": "Project owners cannot leave their own project."}, status=status.HTTP_400_BAD_REQUEST)

        team, _ = Team.objects.get_or_create(project=project)
        if not team.members.filter(id=request.user.id).exists():
            return Response({"detail": "You are not on this project."}, status=status.HTTP_404_NOT_FOUND)

        team.members.remove(request.user)
        return Response({"detail": "You left the project."}, status=status.HTTP_200_OK)


class ConnectionRequestCreateView(generics.CreateAPIView):
    serializer_class = ConnectionRequestSerializer


class IncomingConnectionRequestListView(generics.ListAPIView):
    serializer_class = ConnectionRequestSerializer

    def get_queryset(self):
        return ConnectionRequest.objects.select_related("sender", "receiver").filter(receiver=self.request.user)


class ConnectionStateListView(generics.ListAPIView):
    serializer_class = ConnectionStateSerializer

    def get_queryset(self):
        # Return both sides so the UI can show sent, received, accepted, and rejected states.
        return ConnectionRequest.objects.select_related("sender", "receiver").filter(
            sender=self.request.user
        ) | ConnectionRequest.objects.select_related("sender", "receiver").filter(receiver=self.request.user)


class ConnectionRequestActionView(generics.UpdateAPIView):
    serializer_class = ConnectionRequestActionSerializer
    queryset = ConnectionRequest.objects.select_related("sender", "receiver").all()

    def update(self, request, *args, **kwargs):
        # Only the receiver can accept or reject a direct connection request.
        connection_request = self.get_object()
        if connection_request.receiver != request.user:
            return Response({"detail": "You can only act on requests sent to you."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(connection_request, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ConnectionRequestSerializer(connection_request, context={"request": request}).data, status=status.HTTP_200_OK)


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Profile.objects.select_related("user").all()
    lookup_field = "user_id"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class ProjectJoinRequestCreateView(generics.CreateAPIView):
    serializer_class = ProjectJoinRequestSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["project"] = Project.objects.filter(pk=self.kwargs["project_id"]).first()
        return context


class ProjectJoinRequestActionView(generics.UpdateAPIView):
    serializer_class = ProjectJoinRequestActionSerializer
    queryset = ProjectJoinRequest.objects.select_related("project", "sender").all()

    def update(self, request, *args, **kwargs):
        # Accepting a project join request immediately adds that user to the team.
        join_request = self.get_object()
        if join_request.project.created_by != request.user:
            return Response({"detail": "Only the project owner can act on join requests."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(join_request, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if serializer.validated_data["status"] == "accepted":
            team, _ = Team.objects.get_or_create(project=join_request.project)
            team.members.add(join_request.sender)

        return Response(ProjectJoinRequestSerializer(join_request).data, status=status.HTTP_200_OK)


class TeammateMatchView(APIView):
    def get(self, request):
        # Scores are recalculated when the page loads so profile edits show up quickly.
        current_user = request.user
        candidates = User.objects.exclude(id=current_user.id).select_related("profile")
        matches = []

        for candidate in candidates:
            score = match_users(current_user, candidate)
            if score <= 0:
                continue

            pair = sorted([current_user.id, candidate.id])
            match_score, _ = MatchScore.objects.update_or_create(
                user1_id=pair[0],
                user2_id=pair[1],
                defaults={"score": score},
            )
            matches.append(match_score)

        matches.sort(key=lambda item: item.score, reverse=True)
        serializer = MatchScoreSerializer(matches, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class IdeaSubmissionView(APIView):
    def post(self, request):
        # Every evaluated idea becomes a project, with the full evaluation stored
        # so My Projects can show the same result later.
        serializer = IdeaSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        evaluation = evaluate_idea(data["idea"], data["hours"], data["team_size"])

        project = Project.objects.create(
            title=data["title"],
            description=data["idea"],
            domain=data["domain"],
            required_skills=evaluation.get("required_skills", []),
            github_repo=data.get("github_repo", ""),
            evaluation_result=evaluation,
            created_by=request.user,
            status="open",
        )
        team, _ = Team.objects.get_or_create(project=project)
        team.members.add(request.user)

        return Response(
            {
                "project": ProjectSerializer(project, context={"request": request}).data,
                "evaluation": evaluation,
            },
            status=status.HTTP_201_CREATED,
        )
