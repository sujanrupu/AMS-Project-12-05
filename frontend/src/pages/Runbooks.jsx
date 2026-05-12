import { useEffect, useState } from "react";
import { useSearchParams }     from "react-router-dom";
import { useRunbook }          from "../hooks/useRunbook";
import StatusBar               from "../components/StatusBar";
import ProgressBar             from "../components/ProgressBar";
import RunbookSection          from "../components/RunbookSection";
import ChecklistItem           from "../components/ChecklistItem";
import { apiRequest }          from "../api/apiClient";


// ─────────────────────────────────────────────
// CREATE RUNBOOK MODAL
// ─────────────────────────────────────────────
function CreateRunbookModal({ issueKey, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "", category: "", severity: "", keywords: "",
    escalation_team: "", owner: "", estimated_resolution_time: "",
    ci_asset: "", symptoms: "", resolution_steps: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.id]: e.target.value }));
  }

  async function handleSubmit() {
    const { title, category, severity, resolution_steps, escalation_team } = form;
    if (!title || !category || !severity || !resolution_steps || !escalation_team) {
      setFormMsg({ ok: false, msg: "Please fill in Title, Category, Severity, Escalation Team, and Resolution Steps." });
      return;
    }
    setSaving(true);
    const res = await apiRequest("/runbooks", "POST", form);
    setSaving(false);
    if (res?.error || res?.type === "error") {
      setFormMsg({ ok: false, msg: res.message || "Failed to create runbook." });
      return;
    }
    onSuccess(form.title);
  }

  const inputCls = "w-full bg-[#0f0f14] border border-purple/20 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-purple/50 placeholder:text-slate-600 resize-y";
  const labelCls = "block font-mono text-[0.65rem] text-muted uppercase tracking-widest mb-1.5";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center p-4 animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-purple/25 rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="flex items-center gap-3 px-5 py-4 bg-surface2 border-b border-purple/15 rounded-t-2xl sticky top-0 z-10">
          <div className="w-7 h-7 flex items-center justify-center bg-purple/25 border border-purple/15 rounded-lg">📘</div>
          <span className="text-purple font-bold text-sm flex-1">Create Runbook</span>
          <span className="font-mono text-[0.7rem] text-muted">For: {issueKey}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-muted text-sm transition-all">✕</button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls} htmlFor="title">Title *</label><input className={inputCls} id="title" value={form.title} onChange={handleChange} placeholder="e.g. Zscaler Service Down" /></div>
            <div>
              <label className={labelCls} htmlFor="category">Category *</label>
              <select className={inputCls} id="category" value={form.category} onChange={handleChange}>
                <option value="">Select category</option>
                {["Application","Database","Deployment","Network","Performance","Storage","Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="severity">Severity *</label>
              <select className={inputCls} id="severity" value={form.severity} onChange={handleChange}>
                <option value="">Select severity</option>
                {["P1","P2","P3","P4"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls} htmlFor="keywords">Keywords</label><input className={inputCls} id="keywords" value={form.keywords} onChange={handleChange} placeholder="vpn, auth, network" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls} htmlFor="escalation_team">Escalation Team *</label><input className={inputCls} id="escalation_team" value={form.escalation_team} onChange={handleChange} placeholder="e.g. Network Ops" /></div>
            <div><label className={labelCls} htmlFor="owner">Owner</label><input className={inputCls} id="owner" value={form.owner} onChange={handleChange} placeholder="e.g. John Smith" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls} htmlFor="estimated_resolution_time">Est. Resolution Time</label><input className={inputCls} id="estimated_resolution_time" value={form.estimated_resolution_time} onChange={handleChange} placeholder="e.g. 30 minutes" /></div>
            <div><label className={labelCls} htmlFor="ci_asset">CI / Asset</label><input className={inputCls} id="ci_asset" value={form.ci_asset} onChange={handleChange} placeholder="e.g. FW-CORE-01" /></div>
          </div>
          <div><label className={labelCls} htmlFor="symptoms">Symptoms</label><textarea className={inputCls} id="symptoms" rows={3} value={form.symptoms} onChange={handleChange} placeholder="What does this incident look like? What errors appear?" /></div>
          <div><label className={labelCls} htmlFor="resolution_steps">Resolution Steps *</label><textarea className={inputCls} id="resolution_steps" rows={5} value={form.resolution_steps} onChange={handleChange} placeholder={"1. Check service status\n2. Review logs\n3. Restart if required"} /></div>
          {formMsg && <div className={`font-mono text-xs ${formMsg.ok ? "text-green" : "text-red"}`}>{formMsg.msg}</div>}
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={onClose} className="bg-transparent border border-white/10 text-muted text-sm font-semibold px-5 py-2.5 rounded-lg cursor-pointer">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="bg-gradient-to-r from-purpled to-purple text-white text-sm font-bold px-5 py-2.5 rounded-lg cursor-pointer disabled:opacity-60">
              {saving ? "Saving..." : "Save Runbook"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// RUNBOOK SAVED BANNER
// ─────────────────────────────────────────────
function RunbookSavedBanner({ title, onDismiss }) {
  return (
    <div
      className="flex items-center gap-4 border rounded-2xl px-5 py-4 mt-4 animate-slideUp"
      style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.25)" }}
    >
      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-lg"
        style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}>
        📘
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-green text-sm">Runbook Saved Successfully</p>
        {title && (
          <p className="font-mono text-[0.72rem] text-muted mt-0.5 truncate">
            "{title}" has been added to the runbook library.
          </p>
        )}
      </div>
      <button onClick={onDismiss}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted text-xs transition-all hover:text-slate-200"
        style={{ background: "rgba(255,255,255,0.05)" }}>
        ✕
      </button>
    </div>
  );
}


// ─────────────────────────────────────────────
// RESOLUTION PROMPT
// ─────────────────────────────────────────────
function ResolutionPrompt({ isAiFallback, onResolved }) {
  return (
    <div className="bg-surface border border-purple/30 rounded-2xl mt-4">
      <div className="p-6 text-center">
        <p className="text-[0.95rem] font-bold text-slate-200 mb-2">
          Did these {isAiFallback ? "AI generated" : "runbook"} steps resolve your issue?
        </p>
        <p className="text-[0.8rem] text-muted mb-5">
          {isAiFallback
            ? "If yes, consider saving them as a runbook for future reference."
            : "Let us know so we can keep the runbook library updated."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => onResolved(true)}
            className="bg-green/10 border border-green/30 text-green text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer hover:bg-green/20 transition-all">
            ✔ Yes — {isAiFallback ? "Create Runbook" : "Issue Resolved"}
          </button>
          <button onClick={() => onResolved(false)}
            className="bg-red/10 border border-red/20 text-red text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer hover:bg-red/20 transition-all">
            ✖ No — Escalate
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// AI FALLBACK BANNER
// ─────────────────────────────────────────────
function AiFallbackBanner() {
  return (
    <div className="border border-yellow/20 rounded-2xl overflow-hidden mb-6 animate-slideUp" style={{ background: "rgba(250,204,21,.04)" }}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-yellow/15" style={{ background: "rgba(250,204,21,.06)" }}>
        <div className="w-7 h-7 flex items-center justify-center border border-yellow/20 rounded-lg" style={{ background: "rgba(250,204,21,.15)" }}>⚠️</div>
        <span className="font-bold text-yellow text-sm flex-1">No Runbook Found</span>
        <span className="font-mono text-[0.7rem] text-yellow border border-yellow/20 px-3 py-0.5 rounded-full" style={{ background: "rgba(250,204,21,.08)" }}>AI Fallback</span>
      </div>
      <div className="px-5 py-4">
        <p className="text-[0.825rem] text-slate-400 leading-relaxed">
          No existing runbook matched this incident. The steps below were generated by AI based on your ticket summary.
          If they resolve the issue, consider creating a runbook for future reference.
        </p>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// RUNBOOK INFO PANEL
// ─────────────────────────────────────────────
function RunbookInfoPanel({ data }) {
  if (data.match_type !== "runbook_match") return null;
  return (
    <div className="bg-surface border border-purple/15 rounded-2xl overflow-hidden mb-6 animate-slideUp">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-surface2 border-b border-purple/15">
        <div className="w-7 h-7 flex items-center justify-center bg-purple/25 border border-purple/15 rounded-lg">📘</div>
        <span className="font-bold text-purple text-sm flex-1">Matched Runbook</span>
        <span className="font-mono text-[0.7rem] text-green bg-green/5 border border-green/20 px-3 py-0.5 rounded-full">✔ Runbook Match</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-purple/10">
        <div className="px-5 py-4">
          <span className="font-mono text-[0.6rem] text-muted uppercase tracking-widest block mb-1">Title</span>
          <span className="font-bold text-slate-200">{data.runbook_title || "—"}</span>
        </div>
        <div className="px-5 py-4">
          <span className="font-mono text-[0.6rem] text-muted uppercase tracking-widest block mb-1">Category</span>
          <span className="font-bold text-slate-200">{data.runbook_category || "—"}</span>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// MAIN RUNBOOKS PAGE
// ─────────────────────────────────────────────
export default function Runbooks() {
  const [searchParams] = useSearchParams();
  const issueKey       = searchParams.get("id") || "UNKNOWN";

  const {
    status, data, loading, error,
    checkedItems, toggleCheck, selectAll, getProgress,
    fetchRunbook, completeTicket, escalateTicket,
  } = useRunbook(issueKey);

  const [resolved,          setResolved]         = useState(null);
  const [showRunbookModal,  setShowRunbookModal]  = useState(false);
  const [completedBanner,   setCompletedBanner]   = useState(false);
  const [escalationDisplay, setEscalationDisplay] = useState(null);
  const [savedRunbookTitle, setSavedRunbookTitle] = useState(null);

  useEffect(() => { fetchRunbook(); }, [fetchRunbook]);

  useEffect(() => {
    if (issueKey !== "UNKNOWN" && issueKey.includes(".")) {
      window.location.replace(`/runbooks?id=${issueKey.split(".")[0]}`);
    }
  }, [issueKey]);

  const isAiFallback = data?.match_type === "ai_fallback";
  const paired       = data?.paired_steps || [];
  const progress     = getProgress(paired.length);
  const isCompleted  = data?.ticket_status === "Completed";

  function getEscalationDisplay(escalateRes) {
    if (isAiFallback) {
      return escalateRes?.channel || escalateRes?.team || escalateRes?.escalation_team || "No Channel";
    }
    const category = data?.runbook_category ?? data?.team ?? "No Channel";
    const team     = data?.runbook_escalation_team || data?.team || "";
    return team ? `${category} (${team})` : category;
  }

  async function handleResolved(success) {
    setResolved(success);
    if (success) {
      if (isAiFallback) {
        setShowRunbookModal(true);
      } else {
        const completeRes = await completeTicket();
        if (!completeRes?.error) setCompletedBanner(true);
      }
    } else {
      const escalateRes = await escalateTicket();
      if (escalateRes && !escalateRes.error) {
        localStorage.setItem(`esc_${issueKey}`, escalateRes.channel || escalateRes.team || "");
      }
      setEscalationDisplay(getEscalationDisplay(escalateRes));
    }
  }

  async function handleRunbookSaved(title) {
    setShowRunbookModal(false);
    setSavedRunbookTitle(title);
    const completeRes = await completeTicket();
    if (!completeRes?.error) setCompletedBanner(true);
    setResolved(true);
  }

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 pb-16">

      {/* HEADER */}
      <div className="flex items-center justify-center mb-10 pb-6 border-b border-purple/15">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-purple tracking-tight">⚙ Runbook Execution</h1>
          <span
            className="font-mono inline-block mt-1 text-xs px-3 py-0.5 rounded-full border"
            style={completedBanner || isCompleted
              ? { color: "#4ade80", background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.2)" }
              : { color: "#facc15", background: "rgba(168,85,247,.25)", border: "1px solid rgba(168,85,247,.15)" }
            }
          >
            {issueKey}{(completedBanner || isCompleted) && " · Completed"}
          </span>
        </div>
      </div>

      {/* ALREADY RESOLVED BANNER */}
      {isCompleted && (
        <div
          className="flex items-center gap-4 border rounded-2xl px-5 py-4 mb-6 animate-slideUp"
          style={{ background: "rgba(74,222,128,.06)", borderColor: "rgba(74,222,128,.25)" }}
        >
          <div
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-lg"
            style={{ background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.3)" }}
          >
            ✅
          </div>
          <div>
            <p className="font-bold text-green text-sm">This ticket is already resolved</p>
            <p className="font-mono text-[0.72rem] text-muted mt-0.5">
              Steps shown below are for reference only.
            </p>
          </div>
        </div>
      )}

      {/* COMPLETED BANNER — shown after resolving in current session */}
      {completedBanner && !isCompleted && (
        <div className="flex items-center gap-3 border border-green/25 rounded-xl px-5 py-3 mb-6 animate-slideUp" style={{ background: "rgba(74,222,128,.06)" }}>
          <span>✅</span>
          <span className="font-bold text-green text-sm">Ticket {issueKey} marked as Completed</span>
        </div>
      )}

      {/* AI FALLBACK BANNER or RUNBOOK INFO PANEL */}
      {data && isAiFallback  && <AiFallbackBanner />}
      {data && !isAiFallback && <RunbookInfoPanel data={data} />}

      {/* STATUS BAR — hide for completed or AI fallback */}
      {!isAiFallback && !isCompleted && (
        <StatusBar state={status.state} text={status.text} time={status.time} />
      )}

      {/* PROGRESS BAR — hide for completed tickets */}
      {!isCompleted && <ProgressBar pct={progress} />}

      {/* SKELETON */}
      {loading && (
        <div className="bg-surface border border-purple/15 rounded-2xl p-5 mb-6">
          <div className="h-3.5 rounded-lg bg-surface2 w-2/5 mb-3 animate-pulse" />
          <div className="h-3.5 rounded-lg bg-surface2 w-full mb-2 animate-pulse" />
          <div className="h-3.5 rounded-lg bg-surface2 w-4/5 animate-pulse" />
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="font-mono text-center py-12 text-muted text-sm">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-red font-semibold">Failed to load runbook</div>
          <div className="mt-2">{error}</div>
        </div>
      )}

      {/* CONTENT */}
      {!loading && !error && data && (
        <>
          {paired.length > 0 ? (
            <RunbookSection
              icon="✅"
              title={isAiFallback ? "AI Generated Steps" : "Checklists & Commands"}
              count={`${paired.length} items`}
              delay={0.05}
              rightSlot={
                !isCompleted && (
                  <button
                    onClick={() => selectAll(paired)}
                    className="font-mono text-[0.7rem] text-purple bg-purple/10 border border-purple/20 rounded-md px-3 py-1 cursor-pointer hover:bg-purple/20 transition-all"
                  >
                    {checkedItems.size === paired.length ? "✓ Deselect All" : "☐ Select All"}
                  </button>
                )
              }
            >
              <div className="flex flex-col gap-2">
                {paired.map((item, i) => (
                  isCompleted ? (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-3 bg-surface2 border border-green/10 rounded-xl"
                    >
                      <div
                        className="w-[18px] h-[18px] min-w-[18px] rounded-md flex items-center justify-center mt-0.5 flex-shrink-0"
                        style={{ background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.3)" }}
                      >
                        <span style={{ color: "#4ade80", fontSize: "11px", fontWeight: 900 }}>✓</span>
                      </div>
                      <span className="text-sm leading-relaxed text-muted flex-1">
                        {typeof item === "string" ? item : (item.label || item.step || item.command || JSON.stringify(item))}
                      </span>
                    </div>
                  ) : (
                    <ChecklistItem
                      key={i}
                      item={item}
                      index={i}
                      checked={checkedItems.has(i)}
                      onToggle={toggleCheck}
                    />
                  )
                ))}
              </div>
            </RunbookSection>
          ) : (
            <div className="font-mono text-center py-12 text-muted text-sm">
              <div className="text-4xl mb-4">📭</div>
              <div>No checklist or commands returned.</div>
            </div>
          )}

          {/* RESOLUTION PROMPT — hide for completed tickets */}
          {!isCompleted && progress === 100 && resolved === null && (
            <ResolutionPrompt isAiFallback={isAiFallback} onResolved={handleResolved} />
          )}

          {/* YES — resolved */}
          {resolved === true && !isAiFallback && (
            <div className="bg-surface border border-purple/15 rounded-2xl p-6 text-center mt-4 animate-slideUp">
              <div className="text-3xl mb-3">✅</div>
              <p className="font-bold text-green text-sm">Issue Resolved</p>
              <p className="text-muted text-xs mt-1 leading-relaxed">Great work! The ticket has been marked as completed.</p>
            </div>
          )}

          {/* NO — escalated */}
          {resolved === false && (
            <div className="bg-surface border border-purple/15 rounded-2xl p-6 text-center mt-4 animate-slideUp">
              <p className="font-bold text-red text-sm mb-2">⚠ Issue Not Resolved</p>
              {escalationDisplay && (
                <p className="text-[0.825rem] text-slate-400 leading-relaxed">
                  Escalated to: <strong className="text-slate-200">{escalationDisplay}</strong>
                </p>
              )}
            </div>
          )}

          {/* RUNBOOK SAVED BANNER */}
          {savedRunbookTitle !== null && (
            <RunbookSavedBanner
              title={savedRunbookTitle}
              onDismiss={() => setSavedRunbookTitle(null)}
            />
          )}
        </>
      )}

      {/* CREATE RUNBOOK MODAL */}
      {showRunbookModal && (
        <CreateRunbookModal
          issueKey={issueKey}
          onClose={() => setShowRunbookModal(false)}
          onSuccess={handleRunbookSaved}
        />
      )}

    </div>
  );
}