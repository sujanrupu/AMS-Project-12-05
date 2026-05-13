# modules/runbook_execution/agent.py

from backend.services.llm_service import call_llm
from backend.modules.runbook_execution.service import (
    fetch_best_runbook,
    parse_llm_output,
    filter_safe_commands,
)
from backend.modules.runbook_execution.prompt import (
    RUNBOOK_CHECKLIST_PROMPT,
    FALLBACK_CHECKLIST_PROMPT,
)


class RunbookAgent:

    async def run(self, summary: str, description: str, state: dict) -> dict:

        is_duplicate  = state.get("is_duplicate", False)
        parent_ticket = state.get("parent_ticket_key") or state.get("parent_key")

        if is_duplicate and parent_ticket:
            print(f"[RunbookAgent] ⏭️  Skipping — duplicate of {parent_ticket}")
            return {
                "runbook_title":           None,
                "runbook_category":        None,
                "runbook_escalation_team": None,
                "checklist_steps":         [],
                "commands":                [],
                "paired_steps":            [],
                "match_type":              "skipped_duplicate",
                "message":                 f"Runbook skipped — duplicate of parent ticket {parent_ticket}",
            }

        print(f"\n[RunbookAgent] Searching runbooks for: '{summary[:60]}'")

        runbook = await fetch_best_runbook(summary, description)

        if runbook:
            print(f"[RunbookAgent] ✅ Matched: {runbook['title']}")
            return await self._generate_with_runbook(summary, description, runbook)
        else:
            print("[RunbookAgent] ⚠️  No match — AI fallback")
            return await self._generate_fallback(summary, description)


    async def _generate_with_runbook(
        self, summary: str, description: str, runbook: dict
    ) -> dict:

        prompt = RUNBOOK_CHECKLIST_PROMPT.format(
            summary=summary,
            description=description or "N/A",
            runbook_title=runbook.get("title", ""),
            runbook_category=runbook.get("category", ""),
            runbook_severity=runbook.get("severity", ""),
            runbook_symptoms=runbook.get("symptoms", ""),
            runbook_steps=runbook.get("resolution_steps", ""),
        )

        raw    = await call_llm(prompt)
        paired = parse_llm_output(raw)
        paired = filter_safe_commands(paired)

        return {
            "runbook_title":           runbook.get("title"),
            "runbook_category":        runbook.get("category"),
            "runbook_escalation_team": runbook.get("escalation_team"),
            # paired_steps is the new primary field
            "paired_steps":            paired,
            # keep flat lists for backward compat with cache + other modules
            "checklist_steps":         [p["step"] for p in paired],
            "commands":                [{"label": f"Command {i+1}", "command": p["cmd"]}
                                        for i, p in enumerate(paired) if p["cmd"]],
            "match_type":              "runbook_match",
            "message":                 f"Runbook matched: {runbook.get('title')}",
        }


    async def _generate_fallback(self, summary: str, description: str) -> dict:

        prompt = FALLBACK_CHECKLIST_PROMPT.format(
            summary=summary,
            description=description or "N/A",
        )

        raw    = await call_llm(prompt)
        paired = parse_llm_output(raw)
        paired = filter_safe_commands(paired)

        return {
            "runbook_title":           None,
            "runbook_category":        None,
            "runbook_escalation_team": None,
            "paired_steps":            paired,
            "checklist_steps":         [p["step"] for p in paired],
            "commands":                [{"label": f"Command {i+1}", "command": p["cmd"]}
                                        for i, p in enumerate(paired) if p["cmd"]],
            "match_type":              "ai_fallback",
            "message":                 "No runbook found — AI-generated checklist used",
        }