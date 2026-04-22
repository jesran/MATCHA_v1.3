SKILL_WEIGHT = 70
INTEREST_WEIGHT = 20
AVAILABILITY_WEIGHT = 10
MAX_AVAILABILITY_GAP = 40
ROLE_WEIGHT = 10
DOMAIN_INTEREST_WEIGHT = 20


def _normalize_list(values):
    if not isinstance(values, list):
        return set()

    normalized = set()
    for value in values:
        if not isinstance(value, str):
            continue
        cleaned = value.strip().lower()
        if cleaned:
            normalized.add(cleaned)
    return normalized


def _jaccard_score(set_a, set_b):
    union = set_a | set_b
    if not union:
        return 0.0
    return len(set_a & set_b) / len(union)


def _availability_score(hours_a, hours_b):
    if hours_a is None or hours_b is None:
        return 0.0

    gap = abs(hours_a - hours_b)
    normalized_gap = min(gap, MAX_AVAILABILITY_GAP) / MAX_AVAILABILITY_GAP
    return 1 - normalized_gap


def match_users(user1, user2):
    profile1 = getattr(user1, "profile", None)
    profile2 = getattr(user2, "profile", None)

    if not profile1 or not profile2:
        return 0

    skills1 = _normalize_list(profile1.skills)
    skills2 = _normalize_list(profile2.skills)
    interests1 = _normalize_list(profile1.interests)
    interests2 = _normalize_list(profile2.interests)

    skill_score = _jaccard_score(skills1, skills2) * SKILL_WEIGHT
    interest_score = _jaccard_score(interests1, interests2) * INTEREST_WEIGHT
    availability_score = _availability_score(profile1.availability, profile2.availability) * AVAILABILITY_WEIGHT

    return max(0, min(100, round(skill_score + interest_score + availability_score)))


def suggest_teammates_for_project(project, users, limit=3):
    required_skills = _normalize_list(project.required_skills)
    project_domain = (project.domain or "").strip().lower()
    team_member_ids = set(project.team.members.values_list("id", flat=True)) if hasattr(project, "team") else set()
    team_member_ids.add(project.created_by_id)
    suggestions = []

    for user in users:
        if user.id in team_member_ids:
            continue

        profile = getattr(user, "profile", None)
        if not profile:
            continue

        profile_skills = _normalize_list(profile.skills)
        profile_interests = _normalize_list(profile.interests)
        skill_score = _jaccard_score(required_skills, profile_skills) * SKILL_WEIGHT
        domain_score = (DOMAIN_INTEREST_WEIGHT if project_domain and project_domain in profile_interests else 0)
        availability_score = _availability_score(profile.availability, 10) * AVAILABILITY_WEIGHT
        role_score = ROLE_WEIGHT if profile.preferred_role in {"fullstack", "other"} else ROLE_WEIGHT * 0.7
        total = max(0, min(100, round(skill_score + domain_score + availability_score + role_score)))

        if total <= 0:
            continue

        suggestions.append((total, user))

    suggestions.sort(key=lambda item: item[0], reverse=True)
    return suggestions[:limit]
