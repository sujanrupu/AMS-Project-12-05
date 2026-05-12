import { useState} from "react";
import { apiRequest } from "../api/apiClient";

// ─────────────────────────────────────────────
// SUBMIT TAB — matches submit.js exactly
// ─────────────────────────────────────────────
function SubmitTab() {
  const [form,    setForm]    = useState({ name: "", email: "", summary: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.id]: e.target.value }));
  }

  async function handleSubmit() {
    setResult(null);

    // ── FRONTEND VALIDATION ──
    const missing = [];
    if (!form.name.trim())        missing.push("Name");
    if (!form.email.trim())       missing.push("Email");
    if (!form.summary.trim())     missing.push("Summary");
    if (!form.description.trim()) missing.push("Description");

    if (missing.length > 0) {
      setResult({ ok: false, msg: `Please fill in: ${missing.join(", ")}` });
      return;
    }

    setLoading(true);

    const res = await apiRequest("/submit", "POST", {
      name:        form.name.trim(),
      email:       form.email.trim(),
      summary:     form.summary.trim(),
      description: form.description.trim(),
    });

    if (!res || res.error || res.type === "error") {
      setResult({ ok: false, msg: res?.message || "Unknown error" });
      setLoading(false);
      return;
    }

    setResult({ ok: true, id: res.id });
    setForm({ name: "", email: "", summary: "", description: "" });
    setLoading(false);
  }

  const inputCls = "w-full bg-surface2 border border-purple/15 text-slate-200 rounded-xl px-4 py-3 text-sm focus:border-purple/50 focus:ring-2 focus:ring-purple/10 outline-none transition-all placeholder:text-muted";

  return (
    <div className="bg-surface border border-purple/15 rounded-2xl p-6 shadow-2xl">
      <div className="space-y-3">

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[0.6rem] text-muted mb-1 block tracking-widest uppercase">Name</label>
            <input id="name" value={form.name} onChange={handleChange} placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className="font-mono text-[0.6rem] text-muted mb-1 block tracking-widest uppercase">Email</label>
            <input id="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="font-mono text-[0.6rem] text-muted mb-1 block tracking-widest uppercase">Summary</label>
          <input id="summary" value={form.summary} onChange={handleChange} placeholder="Brief description of the issue" className={inputCls} />
        </div>

        <div>
          <label className="font-mono text-[0.6rem] text-muted mb-1 block tracking-widest uppercase">Description</label>
          <textarea id="description" rows={3} value={form.description} onChange={handleChange} placeholder="Detailed description of the issue..." className={`${inputCls} resize-none`} />
        </div>

      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-4 w-full bg-purple hover:bg-purpled text-white font-bold py-2.5 px-6 rounded-xl flex justify-center items-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple/20 disabled:opacity-60"
      >
        <span>{loading ? "Submitting..." : "Submit Ticket"}</span>
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </button>

      {result && (
        <div className={`font-mono mt-3 text-xs text-center ${result.ok ? "text-green" : "text-red"}`}>
          {result.ok
            ? <><span className="font-semibold">Ticket registered successfully 🎉</span><br /><b>Ticket ID:</b> {result.id || "-"}</>
            : <span className="font-semibold">{result.msg}</span>
          }
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// ANIMATED STEP LOADER — matches ticket-search.js exactly
// ─────────────────────────────────────────────
function StepLoader({ parentKey }) {
  const steps = [
    { icon: "🔍", label: "Fetching ticket details",      sub: "Querying issue registry & metadata" },
    { icon: "👶", label: "Child & parent detection",     sub: "Mapping parent-child relationships & hierarchy" },
    { icon: "🔄", label: "Duplicate detection",          sub: "Cross-checking for duplicate & linked issues" },
    { icon: "📖", label: "Runbook lookup & generation",  sub: "Fetching & compiling resolution runbooks" },
    { icon: "📦", label: "Preparing dashboard view",     sub: "Finalizing all data for render" },
  ];

  return (
    <div style={{
      background: "linear-gradient(160deg, #0d0d1a 0%, #110e1f 100%)",
      border: "1px solid rgba(168,85,247,0.14)",
      borderRadius: 18,
      padding: "22px 24px 20px",
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid rgba(168,85,247,0.25)",
            borderTopColor: "#a855f7",
            animation: "spin 0.85s linear infinite",
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Intelligence Pipeline
            </div>
            <div style={{ fontSize: "0.58rem", color: "#4b5563", marginTop: 2, letterSpacing: "0.04em" }}>
              {parentKey} · {steps.length}-phase ticket analysis
            </div>
          </div>
        </div>
        <span style={{
          fontSize: "0.55rem", letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "1px 6px", borderRadius: 20,
          border: "1px solid rgba(168,85,247,0.2)",
          color: "#7c3aed", background: "rgba(168,85,247,0.06)",
        }}>Running</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "#1a1730", borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: "60%",
          background: "linear-gradient(90deg, #6d28d9, #a855f7, #c084fc)",
          borderRadius: 4, boxShadow: "0 0 8px #a855f760",
          animation: "loaderBarAnim 2s ease-in-out infinite alternate",
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < steps.length - 1 ? 2 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                border: "1.5px solid rgba(168,85,247,0.4)",
                background: "transparent", flexShrink: 0,
                animation: "loaderGlow 1.2s ease-in-out infinite",
              }} />
              {i < steps.length - 1 && (
                <div style={{ width: 1.5, height: 16, background: "#1e1b2e", margin: "2px 0 2px 4.25px" }} />
              )}
            </div>
            <div style={{ minHeight: i < steps.length - 1 ? 34 : 18, paddingBottom: i < steps.length - 1 ? 2 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, lineHeight: 1 }}>
                <span style={{ fontSize: "0.7rem" }}>{s.icon}</span>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8", letterSpacing: "0.025em" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: "0.58rem", color: "#4b5563", marginTop: 2, paddingLeft: 21, letterSpacing: "0.02em" }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.56rem", color: "#2d2d3e", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          ● Ticket intelligence · Est. ~{steps.length}s
        </span>
        <span style={{ fontSize: "0.56rem", color: "#4b5563", letterSpacing: "0.04em" }}>
          Analysing...
        </span>
      </div>

      <style>{`
        @keyframes loaderGlow { 0%,100%{box-shadow:0 0 6px #a855f760} 50%{box-shadow:0 0 14px #a855f7b0} }
        @keyframes loaderBarAnim { from{width:20%} to{width:90%} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}


// ─────────────────────────────────────────────
// SEARCH TAB — matches ticket-search.js exactly
// ─────────────────────────────────────────────
function SearchTab() {
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [parentKey, setParentKey] = useState("");

  function getParentKey(input) {
    const value = input.trim().toUpperCase();
    const match = value.match(/^([A-Z]+-\d+)/);
    return match ? match[1] : value;
  }

  async function handleSearch() {
    const input = query.trim().toUpperCase();
    if (!input) return;

    const pk = getParentKey(input);
    setParentKey(pk);
    setLoading(true);
    setResult(null);
    setError(null);

    // run loader for ~1s per step (5 steps = 5s) in parallel with API call
    const apiPromise = apiRequest(`/tickets/search/${pk}`);

    // minimum display time for the loader
    await new Promise(r => setTimeout(r, 1000));

    const res = await apiPromise;

    setLoading(false);

    if (!res || res.type === "error") {
      setError(res?.message || "Not found");
      return;
    }

    setResult({ ...res, input });

    // highlight + redirect to tickets dashboard
    if (res.parent?.issue_key) {
      localStorage.setItem("highlight_ticket", res.parent.issue_key);
      setTimeout(() => { window.open("/tickets", "_blank"); }, 3000);
    }
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setError(null);
    setParentKey("");
  }

  // find matched child
  const matchedChild = result
    ? result.children?.find(c =>
        (c.child_key || "").trim().toUpperCase() === result.input ||
        (c.issue_key || "").trim().toUpperCase() === result.input
      )
    : null;

  return (
    <div>
      {/* Search bar */}
      <div className="bg-surface border border-purple/15 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <span className="text-purple text-lg">🔎</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search Jira ID (e.g. IMM-101)"
          className="w-full bg-transparent outline-none text-sm text-slate-200 placeholder:text-muted"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-1 rounded-lg bg-purple text-black text-sm font-semibold hover:bg-purple/80 transition"
        >
          Search
        </button>
        {(result || error) && (
          <button
            onClick={handleClear}
            className="font-mono text-[0.65rem] px-3 py-1 rounded-lg border border-red/20 bg-red/10 text-red"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results area */}
      <div className="mt-6">

        {/* Step loader */}
        {loading && <StepLoader parentKey={parentKey} />}

        {/* Error */}
        {!loading && error && (
          <div className="font-mono text-red text-center py-6">❌ {error}</div>
        )}

        {/* Results */}
        {!loading && result && (
          <div className="space-y-4">

            {/* Child card */}
            {matchedChild && (
              <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-4 animate-slideUp">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-yellow text-xs font-bold">{matchedChild.issue_key}</span>
                    {matchedChild.child_key && (
                      <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded-full bg-yellow/10 border border-yellow/20 text-yellow">
                        {matchedChild.child_key}
                      </span>
                    )}
                  </div>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded border ${matchedChild.status === "Completed" ? "text-green border-green/20 bg-green/5" : "text-yellow border-yellow/20 bg-yellow/5"}`}>
                    {matchedChild.status === "Completed" ? "✔ Completed" : "● Open"}
                  </span>
                </div>
                <div className="text-sm space-y-1 text-slate-300">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Name</span>{matchedChild.name || "-"}</div>
                    <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Email</span><span className="truncate block">{matchedChild.email || "-"}</span></div>
                  </div>
                  <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Summary</span>{matchedChild.summary || "-"}</div>
                  <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Description</span>{matchedChild.description || "-"}</div>
                </div>
              </div>
            )}

            {/* Parent card */}
            {result.parent && (
              <div className="border-t border-purple/20 pt-4">
                <div className="font-mono text-xs text-muted mb-2">🔗 Parent Ticket</div>
                <div className="bg-surface border border-purple/15 rounded-2xl overflow-hidden animate-slideUp">

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface2 border-b border-purple/15">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-yellow text-sm font-bold">{result.parent.issue_key}</span>
                      {result.parent.child_count > 0 && (
                        <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded-full bg-purple/10 border border-purple/20 text-purple">
                          {result.parent.child_count} child
                        </span>
                      )}
                    </div>
                    <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full border ${result.parent.status === "Completed" ? "text-green border-green/20 bg-green/5" : "text-yellow border-yellow/20 bg-yellow/5"}`}>
                      {result.parent.status === "Completed" ? "✔ Completed" : "● Open"}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Name</span><span className="text-slate-200">{result.parent.name || "-"}</span></div>
                      <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Email</span><span className="text-slate-200 truncate block">{result.parent.email || "-"}</span></div>
                    </div>
                    <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Summary</span><span className="text-slate-200 text-xs">{result.parent.summary || "-"}</span></div>
                    <div><span className="font-mono text-[0.6rem] text-muted uppercase block mb-0.5">Description</span><span className="text-slate-300 text-xs line-clamp-2">{result.parent.description || "-"}</span></div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-purple/10 flex gap-2">
                    <button
                      onClick={() => window.open(`/runbooks?id=${result.parent.issue_key}`)}
                      className="flex-1 bg-purple/15 border border-purple/20 text-purple text-[0.65rem] font-bold py-2 px-3 rounded-xl font-mono transition-all hover:bg-purple/25"
                    >
                      ⚙ Runbook
                    </button>
                    <button
                      onClick={() => window.open("/tickets","_blank")}
                      className="flex-1 bg-surface2 border border-purple/15 text-slate-300 text-[0.65rem] font-bold py-2 px-3 rounded-xl font-mono transition-all hover:bg-white/5"
                    >
                      View in Dashboard →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Redirect notice */}
            {result.parent?.issue_key && (
              <div className="font-mono text-xs text-yellow text-center animate-pulse">
                Redirecting to dashboard...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// MAIN INDEX PAGE
// ─────────────────────────────────────────────
export default function Index() {
  const [tab, setTab] = useState("search");

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md animate-slideUp">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-purple tracking-tight">⚡ AMS System</h1>
          <p className="font-mono text-muted text-xs mt-2">Search or Submit issues</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-2 bg-surface border border-purple/15 rounded-2xl p-1">
            <button
              onClick={() => setTab("search")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === "search" ? "bg-purple text-black" : "text-slate-200"}`}
            >
              🔎 Search
            </button>
            <button
              onClick={() => setTab("submit")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === "submit" ? "bg-purple text-black" : "text-slate-200"}`}
            >
              📝 Submit
            </button>
          </div>
        </div>

        {/* Tab content */}
        {tab === "search" ? <SearchTab /> : <SubmitTab />}

        {/* Footer */}
        <div className="text-center mt-6">
          <a href="/tickets" target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-purple transition-colors">
            View All Tickets →
          </a>
        </div>

      </div>
    </div>
  );
}