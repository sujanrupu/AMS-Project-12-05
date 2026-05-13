# orchestrator/ams_orchestrator.py

from backend.modules.duplicate_detection.handler import handle_duplicate_flow
from backend.modules.runbook_execution.handler   import handle_runbook_flow
from backend.modules.copilot_rca.handler         import handle_rca_flow


async def handle_ticket(data):

    state = {
        "data":    data,
        "summary": getattr(data, "summary", "") if data else "",
        "type":    None,
        "id":      None,
        "message": None,

        # duplicate flag
        "is_duplicate": False,

        # runbook defaults
        "runbook_title":    None,
        "runbook_category": None,
        "runbook_owner":    None,
        "runbook_ci_asset": None,
        "match_type":       None,
        "checklist_steps":  [],
        "commands":         [],

        # rca defaults  ← these were absent, causing normalize_response to drop them
        "rca_root_cause":       None,
        "rca_affected":         None,
        "rca_steps":            [],
        "rca_confidence":       None,
        "rca_confidence_label": None,
        "rca_summary":          None,
    }

    try:

        # STEP 1 — DUPLICATE DETECTION
        state = await safe_run_module(handle_duplicate_flow, state)

        if not state.get("summary") and state.get("data"):
            data_obj = state["data"]
            state["summary"] = getattr(data_obj, "summary", "") \
                if hasattr(data_obj, "summary") else ""

        if state.get("is_duplicate"):
            return normalize_response(state)

        # STEP 2 — RUNBOOK EXECUTION
        state = await safe_run_module(handle_runbook_flow, state)

        # STEP 3 — RCA GENERATION + DB SAVE
        state = await safe_run_module(handle_rca_flow, state)

        return normalize_response(state)

    except Exception as e:
        return {
            "type":    "error",
            "message": f"Orchestrator failed: {str(e)}"
        }


async def safe_run_module(module_fn, state: dict):
    try:
        result = await module_fn(state)
        if not isinstance(result, dict):
            return {**state, "type": "error", "message": "Module returned invalid state"}
        state.update(result)
        return state
    except Exception as e:
        return {**state, "type": "error", "message": f"Module failed: {str(e)}"}


def normalize_response(state: dict):
    return {
        "type":    state.get("type", "success"),
        "id":      state.get("id"),
        "message": state.get("message"),

        "runbook": {
            "title":      state.get("runbook_title"),
            "category":   state.get("runbook_category"),
            "owner":      state.get("runbook_owner"),
            "ci_asset":   state.get("runbook_ci_asset"),
            "match_type": state.get("match_type"),
        } if state.get("match_type") else None,

        "checklist_steps": state.get("checklist_steps", []),
        "commands":        state.get("commands", []),

        # RCA — was completely missing from old normalize_response
        "rca": {
            "root_cause":       state.get("rca_root_cause"),
            "affected":         state.get("rca_affected"),
            "steps":            state.get("rca_steps", []),
            "confidence":       state.get("rca_confidence"),
            "confidence_label": state.get("rca_confidence_label"),
            "summary":          state.get("rca_summary"),
        } if state.get("rca_root_cause") else None,
    }