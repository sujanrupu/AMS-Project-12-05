import json
import re

from services.escalation_service.escalation_config import (
    TEAM_CHANNELS,
    ESCALATION_MATRIX,
    FALLBACK_CHANNEL,
    VALID_TEAMS,
)

_CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    ("network",     "network"),
    ("perf",        "performance"),
    ("performance", "performance"),
    ("database",    "database"),
    ("db",          "database"),
    ("sql",         "database"),
    ("deploy",      "deployment"),
    ("deployment",  "deployment"),
    ("release",     "deployment"),
    ("cicd",        "deployment"),
    ("ci/cd",       "deployment"),
    ("pipeline",    "deployment"),
    ("storage",     "storage"),
    ("disk",        "storage"),
    ("blob",        "storage"),
    ("s3",          "storage"),
    ("hardware",    "hardware"),
    ("server",      "hardware"),
    ("infra",       "hardware"),
    ("application", "application"),
    ("app",         "application"),
    ("service",     "application"),
    ("api",         "application"),
    ("platform",    "platform"),
]


def _normalise_category(raw: str) -> str:
    if not raw:
        return "platform"
    text = str(raw).lower().strip()
    if text in VALID_TEAMS:
        return text
    for keyword, team in _CATEGORY_KEYWORDS:
        if keyword in text:
            return team
    return "platform"


def _normalise_priority(raw: str) -> str:
    if not raw:
        return "P3"
    text = str(raw).upper().strip()
    if text in ESCALATION_MATRIX:
        return text
    if text.isdigit() and f"P{text}" in ESCALATION_MATRIX:
        return f"P{text}"
    label_map = {
        "CRITICAL": "P1", "HIGH": "P2",
        "MEDIUM": "P3",   "MED": "P3",
        "LOW": "P4",      "PLANNING": "P5",
    }
    for label, p in label_map.items():
        if label in text:
            return p
    return "P3"


def _classify_level_with_llm(summary: str, priority: str, team: str, llm) -> str | None:
    prompt = f"""You are an ITSM escalation classifier.

Escalation Level Rules:
- L1 (First-Line Support): Simple, well-known issues that front-line agents can resolve.
  Examples: password reset, cache clear, service restart, access verification,
  basic connectivity check, standard config lookup.

- L2 (Second-Line Support): Infrastructure or configuration issues needing deeper access.
  Examples: API failures, environment/deployment config issues, integration problems,
  performance degradation requiring investigation, firewall/network config changes,
  database query tuning, service misconfiguration.

- L3 (Third-Line Support): Complex issues requiring senior engineers or vendor escalation.
  Examples: code defects, production outages, database corruption, security incidents,
  data loss, critical failures, issues with no known runbook.

Ticket information:
  Team/Category: {team}
  Priority: {priority}
  Summary: {summary}

Based on the technical nature described, which level should handle this?
Respond ONLY with valid JSON, nothing else:
{{"level": "L1|L2|L3", "reason": "one short sentence"}}"""

    try:
        response = llm.invoke(prompt)
        raw = response.content.strip()
        raw = re.sub(r"^```(?:json)?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()

        result = json.loads(raw)
        level  = str(result.get("level", "")).upper().strip()
        reason = result.get("reason", "")

        if level not in ("L1", "L2", "L3"):
            raise ValueError(f"Invalid level: {level}")

        print(f"[EscalationEngine] 🤖 LLM classified level={level} | reason: {reason}")
        return level

    except Exception as e:
        print(f"[EscalationEngine] ⚠️  LLM level classification failed: {e} — falling back to priority matrix")
        return None


def _apply_priority_override(llm_level: str, priority: str) -> str:
    level_rank = {"L1": 1, "L2": 2, "L3": 3}
    rank_level = {1: "L1", 2: "L2", 3: "L3"}

    minimum_level = {
        "P1": "L2",
        "P2": "L1",
        "P3": "L1",
        "P4": "L1",
        "P5": "L1",
    }.get(priority, "L1")

    current_rank = level_rank.get(llm_level, 1)
    minimum_rank = level_rank.get(minimum_level, 1)

    if current_rank < minimum_rank:
        upgraded = rank_level[minimum_rank]
        print(
            f"[EscalationEngine] ⬆️  Priority override: {priority} requires ≥{minimum_level} "
            f"— upgrading {llm_level} → {upgraded}"
        )
        return upgraded

    return llm_level


def determine_escalation(priority: str, category: str, summary: str = "", llm=None) -> dict:
    norm_priority = _normalise_priority(priority)
    norm_team     = _normalise_category(category)

    llm_level = None
    if llm and summary:
        llm_level = _classify_level_with_llm(summary, norm_priority, norm_team, llm)

    if llm_level:
        level = _apply_priority_override(llm_level, norm_priority)
    else:
        level = ESCALATION_MATRIX.get(norm_priority, "L1")
        print(f"[EscalationEngine] 📊 Priority matrix fallback: {norm_priority} → {level}")

    team_map = TEAM_CHANNELS.get(norm_team, TEAM_CHANNELS["platform"])
    channel  = team_map.get(level, FALLBACK_CHANNEL)

    print(
        f"[EscalationEngine] ✅ Final: priority={norm_priority} | "
        f"team={norm_team} | level={level} | channel={channel}"
    )

    return {
        "team":    norm_team,
        "level":   level,
        "channel": channel,
    }
