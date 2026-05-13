import os
import httpx

from core.config import Config
from services.llm_service import call_llm

from services.escalation_service.escalation_engine import determine_escalation
from services.escalation_service.escalation_config import FALLBACK_CHANNEL, VALID_TEAMS

from langchain_groq import ChatGroq

_llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model_name=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
    temperature=0,
)


def _normalize(value: str) -> str:
    return value.strip().lower() if value else ""


async def infer_team_from_ai(summary: str) -> str | None:
    teams_list = ", ".join(sorted(VALID_TEAMS))

    prompt = f"""You are an incident routing system.

Available teams (respond with EXACTLY one of these words, nothing else):
{teams_list}

Rules:
- Return only a single lowercase word from the list above.
- No punctuation, no explanation, no extra words.
- If unsure, return: platform

Incident summary:
{summary}

Answer:"""

    try:
        raw    = await call_llm(prompt)
        team   = _normalize(raw).split()[0]          
        result = team if team in VALID_TEAMS else None

        if result:
            print(f"[SlackService] 🤖 AI inferred team: '{result}'")
        else:
            print(f"[SlackService] ⚠️  AI returned unrecognised team: '{raw}' — using fallback")

        return result

    except Exception as e:
        print(f"[SlackService] AI team inference failed: {e}")
        return None


async def _post_to_slack(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            "https://slack.com/api/chat.postMessage",
            headers={
                "Authorization": f"Bearer {Config.SLACK_BOT_TOKEN}",
                "Content-Type":  "application/json",
            },
            json=payload,
        )

    data = res.json()

    if not data.get("ok"):
        error = data.get("error", "unknown_error")
        hints = {
            "not_in_channel":    "Invite the bot: /invite @BotName in the channel",
            "channel_not_found": "Channel does not exist — create it and invite the bot",
            "invalid_auth":      "SLACK_BOT_TOKEN is wrong or expired",
            "missing_scope":     "Bot is missing the chat:write OAuth scope",
            "token_revoked":     "SLACK_BOT_TOKEN has been revoked — regenerate it",
        }
        hint = hints.get(error, "Check Slack API dashboard for details")
        print(f"[SlackService] ❌ Slack error: '{error}' → {hint}")

    return data


async def send_to_slack(state: dict) -> dict:
    try:
        incident_id = state.get("id",             "UNKNOWN")
        priority    = state.get("priority",       "P3")
        summary     = state.get("summary",        "")
        match_type  = state.get("match_type",     "ai_fallback")
        category    = state.get("runbook_category")

        team = _normalize(category) if category else None

        if not team or team not in VALID_TEAMS:
            team = await infer_team_from_ai(summary)

        if not team:
            team = "platform"
            print("[SlackService] ⚠️  No team resolved — defaulting to 'platform'")

        escalation = determine_escalation(
            priority=priority,
            category=team,
            summary=summary,
            llm=_llm,                 
        )
        channel = escalation["channel"]
        level   = escalation["level"]
        team    = escalation["team"]   

        print(
            f"[SlackService] 🚨 Routing: ticket={incident_id} | "
            f"priority={priority} | team={team} | level={level} | channel={channel}"
        )

        priority_emoji = {
            "P1": "🔴", "P2": "🟠", "P3": "🟡", "P4": "🟢", "P5": "⚪"
        }.get(str(priority).upper(), "🔴")

        level_emoji = {"L1": "🟦", "L2": "🟧", "L3": "🟥"}.get(level, "🟥")

        fallback_text = (
            f"🚨 [{priority}] Incident {incident_id} escalated to {level} "
            f"— {team.upper()} team"
        )

        payload = {
            "channel": channel,
            "text":    fallback_text,
            "blocks": [

                {
                    "type": "header",
                    "text": {
                        "type":  "plain_text",
                        "text":  f"🚨 Incident Escalated — {level}",
                        "emoji": True,
                    },
                },

                {"type": "divider"},

                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Ticket ID*\n`{incident_id}`",
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Priority*\n{priority_emoji} `{priority}`",
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Team*\n`{team.upper()}`",
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Escalation Level*\n{level_emoji} *{level}*",
                        },
                    ],
                },

                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Summary*\n{summary or '_No summary provided_'}",
                    },
                },

                {"type": "divider"},

                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": (
                                f"📌 Routed to `{channel}` "
                                f"• Match type: `{match_type}` "
                                f"• Ticket: `{incident_id}`"
                            ),
                        }
                    ],
                },
            ],
        }

        data    = await _post_to_slack(payload)
        success = data.get("ok", False)

        return {
            "success":    success,
            "channel":    channel,
            "team":       team,
            "level":      level,
            "match_type": match_type,
            "category":   team,
            **({"error": data.get("error")} if not success else {}),
        }

    except Exception as e:
        print(f"[SlackService] ❌ Unexpected exception: {e}")
        return {
            "success":    False,
            "error":      str(e),
            "channel":    None,
            "team":       None,
            "level":      None,
            "category":   None,
            "match_type": state.get("match_type"),
        }
