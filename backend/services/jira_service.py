# services/jira_service.py

import httpx
import re

from backend.core.config import Config
from backend.repositories.ticket_repository import get_all_tickets

auth = (Config.JIRA_EMAIL, Config.JIRA_API_TOKEN)

headers = {
    "Accept":       "application/json",
    "Content-Type": "application/json"
}

BASE_URL = f"https://{Config.JIRA_DOMAIN}"


# ─────────────────────────────────────────────
# CREATE JIRA TICKET
# ─────────────────────────────────────────────
async def create_ticket(data, related=""):

    url = f"{BASE_URL}/rest/servicedeskapi/request"

    summary     = getattr(data, "summary",     None) or data.get("summary",     "")
    description = getattr(data, "description", None) or data.get("description", "")

    payload = {
        "serviceDeskId": Config.SERVICE_DESK_ID,
        "requestTypeId": Config.REQUEST_TYPE_ID,
        "requestFieldValues": {
            "summary":     summary,
            "description": f"{description}\n\nRelated:\n{related}"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(url, json=payload, headers=headers, auth=auth)

        if res.status_code not in [200, 201]:
            print("❌ Jira create error:", res.text)
            return None

        return res.json()

    except Exception as e:
        print("❌ Exception in create_ticket:", str(e))
        return None


# ─────────────────────────────────────────────
# ADD RCA AS COMMENT ON JIRA TICKET
# Called after RCA is generated so the Jira
# ticket's comment thread contains the full
# root cause analysis for the support team.
# ─────────────────────────────────────────────
async def add_rca_comment(
    issue_key:         str,
    root_cause:        str,
    affected:          str,
    resolution_steps:  list,
    confidence:        str,
    source:            str        = "generated",
    matched_from:      str | None = None,
) -> bool:
    """
    Posts the RCA result as a rich-text comment on the Jira issue.
    Uses the Atlassian Document Format (ADF) so it renders nicely.
    """
    url = f"{BASE_URL}/rest/api/3/issue/{issue_key}/comment"

    # ── Build confidence badge text ──
    conf_emoji = {"HIGH": "🟢", "MEDIUM": "🟡", "LOW": "🔴", "HUMAN": "🔵"}.get(confidence, "⚪")
    source_label = {
        "generated":                  "AI Generated",
        "matched":                    f"Matched from past ticket: {matched_from or ''}",
        "knowledge_base":             f"Knowledge Base: {matched_from or ''}",
        "generated_with_clarification": "AI Generated (with clarification)",
        "human_override":             "Human Verified",
    }.get(source, source)

    # ── Build resolution steps as ADF list items ──
    step_items = [
        {
            "type": "listItem",
            "content": [{
                "type": "paragraph",
                "content": [{"type": "text", "text": step}]
            }]
        }
        for step in (resolution_steps or [])
    ]

    # ── Full ADF comment body ──
    adf_body = {
        "type":    "doc",
        "version": 1,
        "content": [
            # Header
            {
                "type": "heading",
                "attrs": {"level": 3},
                "content": [{"type": "text", "text": "🔍 Copilot Root Cause Analysis"}]
            },
            # Confidence + source
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": f"{conf_emoji} Confidence: ", "marks": [{"type": "strong"}]},
                    {"type": "text", "text": confidence},
                    {"type": "hardBreak"},
                    {"type": "text", "text": "Source: ",                   "marks": [{"type": "strong"}]},
                    {"type": "text", "text": source_label},
                ]
            },
            # Root cause
            {
                "type": "heading",
                "attrs": {"level": 4},
                "content": [{"type": "text", "text": "Root Cause"}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": root_cause or "–"}]
            },
            # Affected component
            {
                "type": "heading",
                "attrs": {"level": 4},
                "content": [{"type": "text", "text": "Affected Component"}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": affected or "–",
                              "marks": [{"type": "strong"}]}]
            },
            # Resolution steps
            {
                "type": "heading",
                "attrs": {"level": 4},
                "content": [{"type": "text", "text": "Resolution Steps"}]
            },
            *(
                [{
                    "type":    "orderedList",
                    "content": step_items
                }]
                if step_items
                else [{
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "No resolution steps generated."}]
                }]
            ),
            # Footer
            {
                "type": "paragraph",
                "content": [{
                    "type": "text",
                    "text": "— AMS Copilot RCA Engine",
                    "marks": [{"type": "em"}]
                }]
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                url,
                json={"body": adf_body},
                headers=headers,
                auth=auth
            )

        if res.status_code not in [200, 201]:
            print(f"❌ add_rca_comment failed for {issue_key}: {res.text}")
            return False

        print(f"💬 [{issue_key}] RCA comment posted to Jira")
        return True

    except Exception as e:
        print(f"❌ add_rca_comment exception: {e}")
        return False


# ─────────────────────────────────────────────
# APPEND DUPLICATE INFO INTO PARENT TICKET
# ─────────────────────────────────────────────
async def append_duplicate(parent_key, child_key, summary):

    url      = f"{BASE_URL}/rest/api/3/issue/{parent_key}"
    new_text = f"[{child_key}] {summary}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(url, headers=headers, auth=auth)

        if res.status_code != 200:
            print("❌ Failed to fetch parent issue:", res.text)
            return False

        issue = res.json()
        desc  = issue.get("fields", {}).get("description")

        new_block = {
            "type": "paragraph",
            "content": [{"type": "text", "text": new_text}]
        }

        content = []
        if isinstance(desc, dict) and "content" in desc:
            content = desc["content"]

        content.append(new_block)

        payload = {
            "fields": {
                "description": {
                    "type":    "doc",
                    "version": 1,
                    "content": content
                }
            }
        }

        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.put(url, json=payload, headers=headers, auth=auth)

        if res.status_code not in [200, 204]:
            print("❌ Error appending duplicate:", res.text)
            return False

        return True

    except Exception as e:
        print("❌ append_duplicate exception:", str(e))
        return False


# ─────────────────────────────────────────────
# GENERATE CHILD KEY
# ─────────────────────────────────────────────
async def generate_child_id(parent_key: str):

    tickets = await get_all_tickets()
    pattern = re.compile(rf"^{re.escape(parent_key)}\.(\d+)$")
    max_num = 0

    for t in tickets:
        child_key = t.get("child_key") or ""
        if child_key.count(".") > 1:
            continue
        match = pattern.match(child_key)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num

    return f"{parent_key}.{max_num + 1}"


# ─────────────────────────────────────────────
# DELETE SINGLE JIRA TICKET
# ─────────────────────────────────────────────
async def delete_jira_ticket(issue_key: str):

    url = f"{BASE_URL}/rest/api/3/issue/{issue_key}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.delete(url, headers=headers, auth=auth)

        if res.status_code not in [200, 204]:
            print(f"❌ Jira delete failed {issue_key}:", res.text)
            return False

        print(f"🗑 Jira ticket deleted: {issue_key}")
        return True

    except Exception as e:
        print("❌ delete_jira_ticket exception:", str(e))
        return False


# ─────────────────────────────────────────────
# UPDATE SINGLE JIRA ISSUE STATUS
# ─────────────────────────────────────────────
async def update_jira_status(issue_key: str):

    url = f"{BASE_URL}/rest/api/3/issue/{issue_key}/transitions"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(url, headers=headers, auth=auth)

        if res.status_code != 200:
            print(f"❌ Failed to fetch transitions for {issue_key}:", res.text)
            return False

        transitions   = res.json().get("transitions", [])
        transition_id = None

        for t in transitions:
            name = t.get("name", "").lower()
            if any(k in name for k in ["done", "complete", "resolve", "close"]):
                transition_id = t.get("id")
                break

        if not transition_id:
            print(f"❌ No suitable transition found for {issue_key}")
            return False

        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                url,
                json={"transition": {"id": transition_id}},
                headers=headers,
                auth=auth
            )

        if res.status_code not in [200, 204]:
            print(f"❌ Jira status update failed for {issue_key}:", res.text)
            return False

        print(f"✅ Jira ticket completed: {issue_key}")
        return True

    except Exception as e:
        print("❌ update_jira_status exception:", str(e))
        return False


# ─────────────────────────────────────────────
# GET ALL RELATED TICKETS
# ─────────────────────────────────────────────
async def get_related_tickets(parent_key: str):

    tickets = await get_all_tickets()

    return [
        t for t in tickets
        if t.get("issue_key") == parent_key
        or t.get("parent_ticket_key") == parent_key
    ]


# ─────────────────────────────────────────────
# COMPLETE PARENT + ALL CHILD JIRA TICKETS
# ─────────────────────────────────────────────
async def complete_parent_and_children(parent_key: str):

    try:
        related_tickets = await get_related_tickets(parent_key)

        if not related_tickets:
            print(f"⚠️ No related tickets found for {parent_key}")
            return False

        success = True
        for t in related_tickets:
            jira_issue_key = t.get("issue_key")
            if not jira_issue_key:
                continue
            if not await update_jira_status(jira_issue_key):
                success = False

        return success

    except Exception as e:
        print("❌ complete_parent_and_children exception:", str(e))
        return False


# ─────────────────────────────────────────────
# DELETE PARENT + ALL CHILD JIRA TICKETS
# ─────────────────────────────────────────────
async def delete_parent_and_children(parent_key: str):

    try:
        related_tickets = await get_related_tickets(parent_key)

        if not related_tickets:
            print(f"⚠️ No related tickets found for {parent_key}")
            return False

        children = [t for t in related_tickets if t.get("parent_ticket_key") == parent_key]
        parent   = [t for t in related_tickets if t.get("issue_key") == parent_key]
        ordered  = children + parent

        success = True
        for t in ordered:
            jira_issue_key = t.get("issue_key")
            if not jira_issue_key:
                continue
            if not await delete_jira_ticket(jira_issue_key):
                success = False

        return success

    except Exception as e:
        print("❌ delete_parent_and_children exception:", str(e))
        return False