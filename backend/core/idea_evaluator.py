import json
import os
import re

import requests


OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral:7b")
REQUEST_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))
EXPECTED_KEYS = {
    "feasibility",
    "estimated_hours",
    "challenges",
    "required_skills",
    "features",
    "brutal_feedback",
    "execution_phases",
}


def _reasonable_hour_estimate(idea, hours, team_size):
    # Keep fallback estimates useful for small MVPs instead of letting a model
    # over-scope simple ideas into hundreds of hours.
    words = len((idea or "").split())
    base = 12
    if words > 35:
        base += 10
    if words > 80:
        base += 16
    base += min(max(team_size - 1, 0) * 4, 16)
    weekly_capacity = max(hours, 1) * max(team_size, 1)
    scope_cap = 72 if words < 80 else 96
    return max(8, min(scope_cap, max(base, min(weekly_capacity * 2, scope_cap))))


def _normalize_estimated_hours(value, idea, hours, team_size):
    # The model may return ranges or unrealistic numbers; normalize to one
    # readable total-hour value before storing it on the project.
    fallback = _reasonable_hour_estimate(idea, hours, team_size)
    numbers = [int(item) for item in re.findall(r"\d+", str(value or ""))]
    if not numbers:
        return f"{fallback} hours"

    estimate = max(numbers) if "-" in str(value) else numbers[0]
    if estimate > 120:
        estimate = fallback
    elif estimate > 96 and len((idea or "").split()) < 80:
        estimate = min(estimate, 72)
    elif estimate < 4:
        estimate = fallback
    return f"{estimate} hours"


def _fallback_response(idea, hours, team_size, reason):
    # The UI still needs a complete result even when Ollama is down or returns
    # malformed JSON.
    estimated = _reasonable_hour_estimate(idea, hours, team_size)
    return {
        "feasibility": "medium",
        "estimated_hours": f"{estimated} hours",
        "challenges": [
            "The AI evaluator could not fully validate the scope.",
            "You should manually confirm delivery risk before starting.",
        ],
        "required_skills": ["react", "django", "postgresql"],
        "features": [
            "Project submission",
            "Idea evaluation",
            "Teammate matching",
        ],
        "execution_phases": [
            {
                "name": "Phase 1 - Define the MVP",
                "steps": ["Clarify the single user flow", "Pick a simple UI", "Set up the basic input/output logic"],
            },
            {
                "name": "Phase 2 - Build the Core",
                "steps": ["Implement the reverse-name logic", "Connect the UI to the backend", "Test the happy path"],
            },
            {
                "name": "Phase 3 - Polish and Launch",
                "steps": ["Handle errors and empty input", "Improve copy and styling", "Deploy a small usable version"],
            },
        ],
        "brutal_feedback": (
            f"Ollama returned an unusable response ({reason}). "
            f"Your idea still needs tighter scope and clearer priorities: {idea[:120]}"
        ),
    }


def _clean_list(values):
    if not isinstance(values, list):
        return []

    cleaned = []
    for value in values:
        if not isinstance(value, str):
            continue
        item = value.strip()
        if item and item not in cleaned:
            cleaned.append(item)
    return cleaned


def _extract_json_block(text):
    # Ollama can occasionally wrap JSON with extra text, so pull out the object.
    if not text:
        raise ValueError("Empty response body")

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON object found in Ollama response")

    return text[start : end + 1]


def _normalize_response(payload, idea, hours, team_size):
    return {
        "feasibility": str(payload.get("feasibility", "medium")).strip().lower() or "medium",
        "estimated_hours": _normalize_estimated_hours(payload.get("estimated_hours", ""), idea, hours, team_size),
        "challenges": _clean_list(payload.get("challenges", [])),
        "required_skills": _clean_list(payload.get("required_skills", [])),
        "features": _clean_list(payload.get("features", [])),
        "execution_phases": [
            {
                "name": str(item.get("name", "")).strip(),
                "steps": _clean_list(item.get("steps", [])),
            }
            for item in payload.get("execution_phases", [])
            if isinstance(item, dict)
        ][:3],
        "brutal_feedback": str(payload.get("brutal_feedback", "")).strip(),
    }


def evaluate_idea(idea, hours, team_size):
    # The prompt is strict because the response is saved directly into Project.evaluation_result.
    prompt = f"""
You are evaluating a software project idea for an MVP build.
Return only valid JSON with exactly these keys and no markdown:
{{
  "feasibility": "",
  "estimated_hours": "",
  "challenges": [],
  "required_skills": [],
  "features": [],
  "execution_phases": [
    {{"name": "", "steps": []}},
    {{"name": "", "steps": []}},
    {{"name": "", "steps": []}}
  ],
  "brutal_feedback": ""
}}

Rules:
- feasibility must be one of: low, medium, high
- estimated_hours must be a realistic total MVP build estimate, usually 8-80 hours for simple ideas
- challenges, required_skills, and features must be arrays of short strings
- execution_phases must contain exactly 3 phases with short names and 2-3 basic steps each
- brutal_feedback must be direct, concrete, and concise
- no explanation outside JSON

Idea: {idea}
Available hours per week: {hours}
Preferred team size: {team_size}
""".strip()

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        response_data = response.json()
        raw_text = response_data.get("response", "")
        parsed = json.loads(_extract_json_block(raw_text))

        if not isinstance(parsed, dict):
            raise ValueError("Ollama JSON output is not an object")

        normalized = _normalize_response(parsed, idea, hours, team_size)
        if set(normalized.keys()) != EXPECTED_KEYS:
            raise ValueError("Normalized response does not match expected schema")

        if len(normalized["execution_phases"]) != 3:
            raise ValueError("Execution phases must contain exactly 3 phases")

        if not normalized["brutal_feedback"]:
            normalized["brutal_feedback"] = "The idea is viable, but the scope is still too vague for execution."

        return normalized
    except requests.HTTPError as exc:
        response_text = exc.response.text.strip() if exc.response is not None and exc.response.text else str(exc)
        return _fallback_response(idea, hours, team_size, response_text)
    except (requests.RequestException, ValueError, json.JSONDecodeError) as exc:
        return _fallback_response(idea, hours, team_size, str(exc))
