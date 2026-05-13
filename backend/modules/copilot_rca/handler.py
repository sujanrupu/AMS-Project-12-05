# modules/copilot_rca/handler.py

from .agent import is_same_issue, generate_fresh_rca
from .service import get_confidence_label, get_rca_summary
from backend.repositories.ticket_repository import (
    update_ticket_rca,
    search_completed_tickets_with_rca,
)
from backend.repositories.rca_kb_repository import search_rca_knowledge_base
from backend.services.embedding_service import get_embedding
from backend.services.jira_service import add_rca_comment
from backend.core.constants import RCA_SIMILARITY_THRESHOLD

KB_SIMILARITY_THRESHOLD = 0.55


async def handle_rca_flow(state: dict) -> dict:
    try:
        issue_key   = state.get("id")
        summary     = state.get("summary", "")
        description = ""

        raw_data = state.get("data")
        if raw_data:
            if hasattr(raw_data, "description"):
                description = raw_data.description or ""
            elif isinstance(raw_data, dict):
                description = raw_data.get("description", "")

        if not summary or not description:
            return {**state, "type": "error",
                    "message": "RCA module: summary or description is empty"}

        current = {"summary": summary, "description": description}

        # ── CRITICAL: use same text as insert_ticket embedding ──
        # insert_ticket stores embedding of f"{summary}\n{related}"
        # but we don't have `related` here. Use summary + description
        # which is what rca_routes.py uses — consistent for RCA matching.
        query_embedding = await get_embedding(f"{summary} {description}")
        if query_embedding:
            query_embedding = [float(x) for x in query_embedding]

        root_cause       = None
        affected         = None
        resolution_steps = []
        confidence       = "LOW"
        source           = "generated"
        matched_from     = None
        matched_summary  = None

        # ═══════════════════════════════════════════
        # LAYER A — KB MATCH
        # ═══════════════════════════════════════════
        if query_embedding:
            try:
                kb_results = await search_rca_knowledge_base(query_embedding, top_k=3)
                if kb_results:
                    top_kb        = kb_results[0]
                    kb_similarity = top_kb.get("similarity", 0)
                    print(f"[RCA] KB top match similarity={kb_similarity:.3f}")

                    if kb_similarity >= KB_SIMILARITY_THRESHOLD:
                        from backend.modules.copilot_rca.agent import is_kb_applicable
                        applicable, _ = is_kb_applicable(current, top_kb)
                        if applicable:
                            root_cause       = top_kb.get("root_cause")
                            affected         = top_kb.get("affected_component", "Unknown")
                            resolution_steps = top_kb.get("resolution_steps", [])
                            if isinstance(resolution_steps, str):
                                resolution_steps = [s.strip() for s in resolution_steps.split("\n") if s.strip()]
                            confidence       = top_kb.get("confidence", "HIGH")
                            source           = "knowledge_base"
                            matched_from     = f"KB:{top_kb.get('id')}"
                            matched_summary  = top_kb.get("title")
                            print(f"✅ [{issue_key}] KB match: '{matched_summary}'")
            except Exception as e:
                print(f"⚠️  [{issue_key}] KB search failed: {e}")

        # ═══════════════════════════════════════════
        # LAYER B — PAST COMPLETED TICKET MATCH
        # ═══════════════════════════════════════════
        if root_cause is None and query_embedding:
            try:
                matches    = await search_completed_tickets_with_rca(query_embedding, top_k=5)
                candidates = [t for t in matches if t.get("issue_key") != issue_key]

                if candidates:
                    top        = candidates[0]
                    similarity = top.get("similarity", 0)
                    print(f"[RCA] Past ticket top: '{top.get('issue_key')}' similarity={similarity:.3f}")

                    if similarity >= RCA_SIMILARITY_THRESHOLD:
                        same, _ = is_same_issue(current, top)
                        if same:
                            root_cause       = top.get("rca_root_cause")
                            affected         = top.get("rca_affected", "Unknown")
                            resolution_steps = top.get("rca_steps", [])
                            if isinstance(resolution_steps, str):
                                resolution_steps = [s.strip() for s in resolution_steps.split("\n") if s.strip()]
                            confidence       = top.get("rca_confidence", "MEDIUM")
                            source           = "matched"
                            matched_from     = top.get("issue_key")
                            matched_summary  = top.get("summary")
                            print(f"✅ [{issue_key}] Past ticket match: '{matched_from}'")
                else:
                    print(f"ℹ️  [{issue_key}] No completed tickets with RCA found for matching")
            except Exception as e:
                print(f"⚠️  [{issue_key}] Past ticket search failed: {e}")

        # ═══════════════════════════════════════════
        # LAYER C — FRESH LLM GENERATION
        # ═══════════════════════════════════════════
        if root_cause is None:
            print(f"🤖 [{issue_key}] Generating fresh RCA")
            result           = generate_fresh_rca(current)
            root_cause       = result.get("root_cause", "")
            affected         = result.get("affected_component", "Unknown")
            resolution_steps = result.get("resolution_steps", [])
            confidence       = result.get("confidence", "LOW")
            source           = "generated"
            matched_from     = None
            matched_summary  = None

        # ═══════════════════════════════════════════
        # SAVE TO SUPABASE
        # ═══════════════════════════════════════════
        if issue_key:
            saved = await update_ticket_rca(
                issue_key          = issue_key,
                root_cause         = root_cause,
                affected_component = affected,
                resolution_steps   = resolution_steps,
                confidence         = confidence,
                source             = source,
                matched_from       = matched_from,
                matched_summary    = matched_summary,
            )
            if saved:
                print(f"💾 [{issue_key}] RCA saved (confidence={confidence}, "
                      f"source={source}, matched_from={matched_from})")
            else:
                print(f"⚠️  [{issue_key}] RCA generated but DB save failed")

            # ═══════════════════════════════════════════
            # POST AS JIRA COMMENT
            # ═══════════════════════════════════════════
            await add_rca_comment(
                issue_key        = issue_key,
                root_cause       = root_cause,
                affected         = affected,
                resolution_steps = resolution_steps,
                confidence       = confidence,
                source           = source,
                matched_from     = matched_from,
            )
        else:
            print("⚠️  handle_rca_flow: no issue_key in state — skipping save and comment")

        return {
            **state,
            "type":                 "rca_complete",
            "message":              root_cause or "",
            "rca_root_cause":       root_cause,
            "rca_affected":         affected,
            "rca_steps":            resolution_steps,
            "rca_confidence":       confidence,
            "rca_confidence_label": get_confidence_label(confidence),
            "rca_summary":          get_rca_summary(confidence, affected),
        }

    except Exception as e:
        print(f"❌ handle_rca_flow error: {e}")
        return {**state, "type": "error", "message": f"RCA module failed: {str(e)}"}