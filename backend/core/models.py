from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    mobile_number = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.username


class Profile(models.Model):
    EXPERIENCE_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]
    ROLE_CHOICES = [
        ("frontend", "Frontend"),
        ("backend", "Backend"),
        ("fullstack", "Full Stack"),
        ("designer", "Designer"),
        ("pm", "Product Manager"),
        ("ai", "AI Engineer"),
        ("other", "Other"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    photo = models.FileField(upload_to="profiles/", blank=True, null=True)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    availability = models.PositiveIntegerField(default=5)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES)
    preferred_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    github = models.URLField(blank=True)

    def __str__(self):
        return f"{self.user.username} Profile"


class Project(models.Model):
    # Projects can be created directly or from the idea evaluator; evaluator
    # output is kept here so My Projects can show it later without recalculating.
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in-progress", "In Progress"),
        ("completed", "Completed"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    domain = models.CharField(max_length=100)
    required_skills = models.JSONField(default=list, blank=True)
    github_repo = models.URLField(blank=True)
    evaluation_result = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_projects")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Team(models.Model):
    # One team per project keeps membership actions simple: owners remove users,
    # joined teammates leave, and accepted join requests add members here.
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="team")
    members = models.ManyToManyField(User, related_name="teams", blank=True)

    def __str__(self):
        return f"Team for {self.project.title}"


class MatchScore(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="match_scores_from")
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="match_scores_to")
    score = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user1", "user2"], name="unique_match_pair"),
            models.CheckConstraint(
                condition=~models.Q(user1=models.F("user2")),
                name="prevent_self_match",
            ),
        ]

    def __str__(self):
        return f"{self.user1.username} -> {self.user2.username}: {self.score}"


class ConnectionRequest(models.Model):
    # Direct user-to-user requests power the Matching and Connections pages.
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_requests")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_requests")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["sender", "receiver"], name="unique_connection_request"),
            models.CheckConstraint(
                condition=~models.Q(sender=models.F("receiver")),
                name="prevent_self_request",
            ),
        ]

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"


class ProjectJoinRequest(models.Model):
    # Project join requests are separate from direct connections because they
    # target a project owner and become team membership when accepted.
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="join_requests")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_join_requests")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["project", "sender"], name="unique_project_join_request"),
        ]

    def __str__(self):
        return f"{self.sender.username} -> {self.project.title} ({self.status})"

