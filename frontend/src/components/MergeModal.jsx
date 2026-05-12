import { useState } from "react";

export default function MergeModal({ targetKey, tickets, onClose, onMerge }) {
  const [source, setSource] = useState("");

  function handleMerge() {
    if (!source) { alert("Select a source ticket"); return; }
    onMerge(targetKey, source);
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-purple/15 rounded-2xl w-[520px] p-6 shadow-2xl">

        <h2 className="text-purple font-bold mb-1">Merge into {targetKey}</h2>
        <p className="text-xs text-muted mb-5">Select ONE source ticket to merge</p>

        <label className="font-mono text-[0.65rem] text-muted uppercase tracking-widest block mb-2">
          Source Ticket
        </label>

        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full bg-surface2 border border-purple/15 text-slate-200 rounded-xl px-3 py-2 text-sm mb-6 font-mono focus:border-purple/40 outline-none"
        >
          <option value="">-- Select source ticket --</option>
          {tickets.map(p => (
            <option key={p.issue_key} value={p.issue_key}>
              {p.issue_key} — {p.summary || "No summary"}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-surface2 border border-purple/15 text-slate-300 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            className="flex-1 bg-purple/20 border border-purple/20 text-purple py-2 rounded-xl text-sm font-bold transition-all hover:bg-purple/30"
          >
            Merge
          </button>
        </div>

      </div>
    </div>
  );
}