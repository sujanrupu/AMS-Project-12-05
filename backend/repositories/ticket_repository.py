# repositories/ticket_repository.py

from supabase import create_client
from backend.core.config import Config

supabase = create_client(
    Config.SUPABASE_URL,
    Config.SUPABASE_KEY
)

# ─────────────────────────────────────────────
# ALLOWED FIELDS
# ─────────────────────────────────────────────
ALLOWED_FIELDS = {
    "issue_key",
    "child_key",
    "name",
    "email",
    "summary",
    "description",
    "status",
    "is_duplicate",
    "parent_ticket_key",
    "embedding",
    "paired_steps",
    "runbook_title",
    "runbook_category",
    "runbook_escalation_team",
    "match_type",
    # ── RCA fields ──
    "rca_root_cause",
    "rca_affected",
    "rca_steps",
    "rca_confidence",
    "rca_source",
    "rca_matched_from",
    "rca_matched_summary",
}

# ─────────────────────────────────────────────
# INSERT TICKET
# ─────────────────────────────────────────────
async def insert_ticket(data):
    print("🔥 FINAL RAW PAYLOAD:", data)

    try:
        data = dict(data)
        data = {k: v for k, v in data.items() if k in ALLOWED_FIELDS}

        if data.get("embedding") is not None:
            data["embedding"] = [float(x) for x in data["embedding"]]

        data.setdefault("child_key",    None)
        data.setdefault("paired_steps", None)

        res = supabase.table("tickets").insert(data).execute()
        return res.data[0] if res.data else None

    except Exception as e:
        print("❌ insert_ticket error:", str(e))
        return None


# ─────────────────────────────────────────────
# GET ALL TICKETS
# ─────────────────────────────────────────────
async def get_all_tickets():
    try:
        res = supabase.table("tickets").select("*").execute()
        return res.data or []
    except Exception as e:
        print("❌ get_all_tickets error:", str(e))
        return []


# ─────────────────────────────────────────────
# GET SINGLE TICKET
# ─────────────────────────────────────────────
async def get_ticket(issue_key: str):
    try:
        res = (
            supabase.table("tickets")
            .select("*")
            .eq("issue_key", issue_key)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    except Exception as e:
        print("❌ get_ticket error:", str(e))
        return None


# ─────────────────────────────────────────────
# VECTOR SEARCH  (open, non-duplicate parents)
# ─────────────────────────────────────────────
async def search_similar_tickets(query_embedding, top_k=5):
    try:
        if not query_embedding:
            return []

        query_embedding = [float(x) for x in query_embedding]

        res = supabase.rpc(
            "match_tickets",
            {
                "query_embedding": query_embedding,
                "match_count":     top_k,
            }
        ).execute()

        return res.data or []

    except Exception as e:
        print("❌ vector search error:", str(e))
        return []


# ─────────────────────────────────────────────
# SEARCH COMPLETED TICKETS WITH RCA
# Used by rca_routes.py Layer B to find past
# resolved tickets that already have an RCA,
# so the result can be copied to the new ticket.
# ─────────────────────────────────────────────
async def search_completed_tickets_with_rca(query_embedding: list, top_k: int = 5) -> list:
    """
    Vector-similarity search over completed parent tickets that already
    have an rca_root_cause stored.  Returns the top_k closest matches
    sorted by cosine similarity descending, each row including all RCA
    fields so rca_routes.py can copy them directly.
    """
    try:
        if not query_embedding:
            return []

        query_embedding = [float(x) for x in query_embedding]

        res = supabase.rpc(
            "match_completed_tickets_with_rca",
            {
                "query_embedding": query_embedding,
                "match_count":     top_k,
            }
        ).execute()

        return res.data or []

    except Exception as e:
        print("❌ search_completed_tickets_with_rca error:", str(e))
        return []


# ─────────────────────────────────────────────
# UPDATE TICKET RCA
# Persists the generated / matched / human RCA
# back into the tickets row in Supabase.
# ─────────────────────────────────────────────
async def update_ticket_rca(
    issue_key:          str,
    root_cause:         str,
    affected_component: str,
    resolution_steps:   list,
    confidence:         str,
    source:             str,
    matched_from:       str | None = None,
    matched_summary:    str | None = None,
) -> bool:
    """
    Writes all RCA fields to the tickets table row identified by issue_key.
    """
    try:
        res = (
            supabase.table("tickets")
            .update({
                "rca_root_cause":    root_cause,
                "rca_affected":      affected_component,
                "rca_steps":         resolution_steps,
                "rca_confidence":    confidence,
                "rca_source":        source,
                "rca_matched_from":  matched_from,
                "rca_matched_summary": matched_summary,
            })
            .eq("issue_key", issue_key)
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print(f"❌ update_ticket_rca error: {e}")
        return False


# ─────────────────────────────────────────────
# DELETE SINGLE
# ─────────────────────────────────────────────
async def delete_ticket(issue_key: str):
    try:
        res = (
            supabase.table("tickets")
            .delete()
            .eq("issue_key", issue_key)
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ delete_ticket error:", str(e))
        return False


# ─────────────────────────────────────────────
# DELETE CASCADE
# ─────────────────────────────────────────────
async def delete_ticket_cascade(parent_key: str):
    try:
        res = (
            supabase.table("tickets")
            .delete()
            .or_(
                f"issue_key.eq.{parent_key},"
                f"parent_ticket_key.eq.{parent_key}"
            )
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ delete_ticket_cascade error:", str(e))
        return False


# ─────────────────────────────────────────────
# UPDATE STATUS CASCADE
# ─────────────────────────────────────────────
async def update_status_cascade(parent_key: str, status: str):
    try:
        res = (
            supabase.table("tickets")
            .update({"status": status})
            .or_(
                f"issue_key.eq.{parent_key.strip()},"
                f"parent_ticket_key.eq.{parent_key.strip()}"
            )
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ update_status_cascade error:", str(e))
        return False


# ─────────────────────────────────────────────
# RUNBOOK UPDATE
# paired_steps stores checklist + commands together
# ─────────────────────────────────────────────
async def update_ticket_runbook(
    issue_key:               str,
    paired_steps:            list,
    runbook_title:           str = None,
    runbook_category:        str = None,
    runbook_escalation_team: str = None,
    match_type:              str = None,
) -> bool:
    try:
        res = (
            supabase.table("tickets")
            .update({
                "paired_steps":            paired_steps,
                "runbook_title":           runbook_title,
                "runbook_category":        runbook_category,
                "runbook_escalation_team": runbook_escalation_team,
                "match_type":              match_type,
            })
            .eq("issue_key", issue_key)
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ update_ticket_runbook error:", str(e))
        return False


# ─────────────────────────────────────────────
# GET ONLY PARENT TICKETS
# ─────────────────────────────────────────────
async def get_parent_tickets():
    try:
        res = (
            supabase.table("tickets")
            .select("*")
            .is_("parent_ticket_key", None)
            .execute()
        )
        return res.data or []

    except Exception as e:
        print("❌ get_parent_tickets error:", str(e))
        return []


# ─────────────────────────────────────────────
# GET CHILDREN
# ─────────────────────────────────────────────
async def get_children(parent_key: str):
    try:
        res = (
            supabase.table("tickets")
            .select("*")
            .eq("parent_ticket_key", parent_key)
            .order("created_at", desc=False)
            .execute()
        )
        return res.data or []

    except Exception as e:
        print("❌ get_children error:", str(e))
        return []


# ─────────────────────────────────────────────
# UPDATE PARENT LINK
# ─────────────────────────────────────────────
async def update_parent(issue_key: str, new_parent: str):
    try:
        res = (
            supabase.table("tickets")
            .update({"parent_ticket_key": new_parent})
            .eq("issue_key", issue_key)
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ update_parent error:", str(e))
        return False


# ─────────────────────────────────────────────
# BULK CHILD KEY UPDATE
# ─────────────────────────────────────────────
async def update_child_keys(updates: list):
    try:
        for item in updates:
            supabase.table("tickets") \
                .update({"child_key": item["child_key"]}) \
                .eq("issue_key", item["issue_key"]) \
                .execute()
        return True

    except Exception as e:
        print("❌ update_child_keys error:", str(e))
        return False


# ─────────────────────────────────────────────
# DETACH CHILD FROM PARENT
# ─────────────────────────────────────────────
async def detach_child_ticket(issue_key: str):
    try:
        res = (
            supabase.table("tickets")
            .update({
                "child_key":         None,
                "parent_ticket_key": None,
                "is_duplicate":      False
            })
            .eq("issue_key", issue_key)
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ detach_child_ticket error:", str(e))
        return False


# ─────────────────────────────────────────────
# DELETE ONLY SINGLE TICKET
# ─────────────────────────────────────────────
async def delete_single_ticket(issue_key: str):
    try:
        res = (
            supabase.table("tickets")
            .delete()
            .eq("issue_key", issue_key)
            .execute()
        )
        return bool(res.data)

    except Exception as e:
        print("❌ delete_single_ticket error:", str(e))
        return False


# ─────────────────────────────────────────────
# PROMOTE FIRST CHILD AS NEW PARENT
# ─────────────────────────────────────────────
async def promote_first_child_as_parent(old_parent_key: str):
    try:
        children = (
            supabase.table("tickets")
            .select("*")
            .eq("parent_ticket_key", old_parent_key)
            .order("issue_key", desc=False)
            .execute()
        )
        children = children.data or []

        if not children:
            return None

        new_parent     = children[0]
        new_parent_key = new_parent["issue_key"]

        supabase.table("tickets") \
            .update({
                "parent_ticket_key": None,
                "child_key":         None,
                "is_duplicate":      False
            }) \
            .eq("issue_key", new_parent_key) \
            .execute()

        remaining = sorted(children[1:], key=lambda x: x["issue_key"])
        counter   = 1

        for child in remaining:
            supabase.table("tickets") \
                .update({
                    "parent_ticket_key": new_parent_key,
                    "child_key":         f"{new_parent_key}.{counter}"
                }) \
                .eq("issue_key", child["issue_key"]) \
                .execute()
            counter += 1

        return new_parent_key

    except Exception as e:
        print("❌ promote_first_child_as_parent error:", str(e))
        return None