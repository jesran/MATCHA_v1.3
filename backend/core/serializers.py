from django.contrib.auth import get_user_model
from rest_framework import serializers

from .matching import suggest_teammates_for_project
from .models import ConnectionRequest, MatchScore, Profile, Project, ProjectJoinRequest

User = get_user_model()


def format_display_name(value):
    # Keep usernames and names readable in the UI without changing stored usernames.
    cleaned = (value or "").strip()
    return cleaned[:1].upper() + cleaned[1:].lower() if cleaned else ""


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    mobile_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "mobile_number", "password", "first_name", "last_name"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data["username"] = validated_data.get("username", "").strip().lower()
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    github = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    interests = serializers.SerializerMethodField()
    preferred_role = serializers.SerializerMethodField()
    experience_level = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "mobile_number",
            "first_name",
            "last_name",
            "photo",
            "github",
            "bio",
            "skills",
            "interests",
            "preferred_role",
            "experience_level",
        ]

    def get_username(self, obj):
        return format_display_name(obj.username)

    def get_photo(self, obj):
        # Profile photos need absolute URLs when the frontend is served from Vite.
        profile = getattr(obj, "profile", None)
        if not profile or not profile.photo:
            return ""
        request = self.context.get("request")
        url = profile.photo.url
        return request.build_absolute_uri(url) if request else url

    def get_github(self, obj):
        return getattr(getattr(obj, "profile", None), "github", "")

    def get_bio(self, obj):
        return getattr(getattr(obj, "profile", None), "bio", "")

    def get_skills(self, obj):
        return getattr(getattr(obj, "profile", None), "skills", [])

    def get_interests(self, obj):
        return getattr(getattr(obj, "profile", None), "interests", [])

    def get_preferred_role(self, obj):
        return getattr(getattr(obj, "profile", None), "preferred_role", "")

    def get_experience_level(self, obj):
        return getattr(getattr(obj, "profile", None), "experience_level", "")


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    email = serializers.EmailField(source="user.email", required=False, allow_blank=False)
    mobile_number = serializers.CharField(source="user.mobile_number", required=False, allow_blank=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "email",
            "mobile_number",
            "photo",
            "bio",
            "skills",
            "interests",
            "availability",
            "experience_level",
            "preferred_role",
            "github",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        user_data = validated_data.pop("user", {})
        for field, value in user_data.items():
            setattr(user, field, value)
        if user_data:
            if "first_name" in user_data:
                user_data["first_name"] = format_display_name(user_data["first_name"])
            if "last_name" in user_data:
                user_data["last_name"] = format_display_name(user_data["last_name"])
            user.save(update_fields=list(user_data.keys()))
        profile, _ = Profile.objects.update_or_create(user=user, defaults=validated_data)
        return profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        user = instance.user
        for field, value in user_data.items():
            if field in {"first_name", "last_name"}:
                value = format_display_name(value)
            setattr(user, field, value)
        if user_data:
            user.save(update_fields=list(user_data.keys()))

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    teammate_suggestions = serializers.SerializerMethodField()
    team_members = serializers.SerializerMethodField()
    join_request_status = serializers.SerializerMethodField()
    pending_join_requests = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    is_team_member = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "domain",
            "required_skills",
            "github_repo",
            "evaluation_result",
            "created_by",
            "status",
            "created_at",
            "team_members",
            "teammate_suggestions",
            "join_request_status",
            "pending_join_requests",
            "is_owner",
            "is_team_member",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_team_members(self, obj):
        team = getattr(obj, "team", None)
        if not team:
            return []
        return UserSerializer(team.members.all(), many=True, context=self.context).data

    def get_teammate_suggestions(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []
        users = User.objects.exclude(id=request.user.id).select_related("profile")
        suggestions = suggest_teammates_for_project(obj, users)
        return [
            {
                "score": score,
                "user": UserSerializer(user, context=self.context).data,
                "github": getattr(getattr(user, "profile", None), "github", ""),
            }
            for score, user in suggestions
        ]

    def get_join_request_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return ""
        join_request = obj.join_requests.filter(sender=request.user).first()
        return join_request.status if join_request else ""

    def get_pending_join_requests(self, obj):
        # Only project owners should see the queue of users asking to join.
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []
        if obj.created_by_id != request.user.id:
            return []
        pending = obj.join_requests.select_related("sender").filter(status="pending")
        return ProjectJoinRequestSerializer(pending, many=True, context=self.context).data

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.created_by_id == request.user.id)

    def get_is_team_member(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        team = getattr(obj, "team", None)
        return bool(team and team.members.filter(id=request.user.id).exists())


class ConnectionRequestSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    receiver_id = serializers.IntegerField(write_only=True, required=True)

    class Meta:
        model = ConnectionRequest
        fields = ["id", "sender", "receiver", "receiver_id", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "sender", "receiver", "status", "created_at", "updated_at"]

    def validate_receiver_id(self, value):
        # Validate the target before create() so the frontend gets a clear message.
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("Receiver does not exist.")
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.id == value:
            raise serializers.ValidationError("You cannot send a connection request to yourself.")
        return value

    def create(self, validated_data):
        sender = self.context["request"].user
        receiver = User.objects.get(id=validated_data["receiver_id"])
        # If both users try to connect, treat that as mutual acceptance instead
        # of leaving one pending request and one duplicate-looking sent request.
        reverse_request = ConnectionRequest.objects.filter(sender=receiver, receiver=sender).first()
        if reverse_request:
            if reverse_request.status == "pending":
                reverse_request.status = "accepted"
                reverse_request.save(update_fields=["status", "updated_at"])
                return reverse_request
            if reverse_request.status == "accepted":
                return reverse_request
            reverse_request.delete()

        connection_request, created = ConnectionRequest.objects.get_or_create(
            sender=sender,
            receiver=receiver,
            defaults={"status": "pending"},
        )
        if not created:
            connection_request.status = "pending"
            connection_request.save(update_fields=["status", "updated_at"])
        return connection_request


class ConnectionRequestActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectionRequest
        fields = ["id", "status"]
        read_only_fields = ["id"]

    def validate_status(self, value):
        if value not in {"accepted", "rejected"}:
            raise serializers.ValidationError("Status must be accepted or rejected.")
        return value


class ConnectionStateSerializer(serializers.ModelSerializer):
    counterpart = serializers.SerializerMethodField()
    direction = serializers.SerializerMethodField()

    class Meta:
        model = ConnectionRequest
        fields = ["id", "status", "direction", "counterpart", "created_at", "updated_at"]

    def get_counterpart(self, obj):
        request_user = self.context["request"].user
        counterpart = obj.receiver if obj.sender == request_user else obj.sender
        return UserSerializer(counterpart, context=self.context).data

    def get_direction(self, obj):
        request_user = self.context["request"].user
        return "sent" if obj.sender == request_user else "received"


class MatchScoreSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    explanation = serializers.SerializerMethodField()

    class Meta:
        model = MatchScore
        fields = ["id", "user", "score", "explanation", "updated_at"]

    def get_user(self, obj):
        request_user = self.context["request"].user
        counterpart = obj.user2 if obj.user1 == request_user else obj.user1
        return UserSerializer(counterpart, context=self.context).data

    def get_explanation(self, obj):
        # Build a short reason from the same profile fields used by the matcher.
        request_user = self.context["request"].user
        counterpart = obj.user2 if obj.user1 == request_user else obj.user1
        profile = getattr(request_user, "profile", None)
        other_profile = getattr(counterpart, "profile", None)
        if not profile or not other_profile:
            return "This person has enough profile overlap to be worth a closer look."

        shared_skills = sorted(set(profile.skills or []) & set(other_profile.skills or []))
        shared_interests = sorted(set(profile.interests or []) & set(other_profile.interests or []))
        reasons = []
        if shared_skills:
            reasons.append(f"shared skills in {', '.join(shared_skills[:3])}")
        if shared_interests:
            reasons.append(f"shared interests around {', '.join(shared_interests[:2])}")
        if profile.availability and other_profile.availability:
            gap = abs(profile.availability - other_profile.availability)
            if gap <= 5:
                reasons.append("similar weekly availability")
        if other_profile.preferred_role:
            reasons.append(f"a {other_profile.get_preferred_role_display().lower()} profile")

        if not reasons:
            return "The score is mostly based on compatible availability and adjacent project interests."
        return f"Strong match because of {', '.join(reasons[:3])}."


class PublicProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    mobile_number = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "photo",
            "bio",
            "skills",
            "interests",
            "availability",
            "experience_level",
            "preferred_role",
            "github",
            "email",
            "mobile_number",
        ]

    def get_username(self, obj):
        return format_display_name(obj.user.username)

    def _contact_visible(self, obj):
        # Contact details stay hidden until either the profile owner or an
        # accepted connection views the page.
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user == obj.user:
            return True
        return ConnectionRequest.objects.filter(
            status="accepted",
            sender__in=[request.user, obj.user],
            receiver__in=[request.user, obj.user],
        ).exists()

    def get_email(self, obj):
        return obj.user.email if self._contact_visible(obj) else ""

    def get_mobile_number(self, obj):
        return obj.user.mobile_number if self._contact_visible(obj) else ""


class ProjectJoinRequestSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    project_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ProjectJoinRequest
        fields = ["id", "project_id", "project", "sender", "message", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "project", "sender", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        # The route usually provides the project id, but keeping project_id support
        # makes the serializer usable from direct API calls too.
        project = self.context.get("project")
        request = self.context["request"]
        if not project:
            project_id = attrs.get("project_id")
            if not project_id:
                raise serializers.ValidationError("Project id is required.")
            project = Project.objects.filter(id=project_id).first()
        if not project:
            raise serializers.ValidationError("Project does not exist.")
        if project.created_by == request.user:
            raise serializers.ValidationError("You already own this project.")
        attrs["project"] = project
        return attrs

    def create(self, validated_data):
        project = validated_data["project"]
        sender = self.context["request"].user
        join_request, _ = ProjectJoinRequest.objects.update_or_create(
            project=project,
            sender=sender,
            defaults={"message": validated_data.get("message", ""), "status": "pending"},
        )
        return join_request


class ProjectJoinRequestActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectJoinRequest
        fields = ["status"]

    def validate_status(self, value):
        if value not in {"accepted", "rejected"}:
            raise serializers.ValidationError("Status must be accepted or rejected.")
        return value


class IdeaSubmissionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    idea = serializers.CharField()
    domain = serializers.CharField(max_length=100)
    github_repo = serializers.URLField(required=False, allow_blank=True)
    hours = serializers.IntegerField(min_value=1)
    team_size = serializers.IntegerField(min_value=1)
