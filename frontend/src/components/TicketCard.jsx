import FieldLabel  from "./FieldLabel";
import StatusBadge from "./StatusBadge";

export default function TicketCard({ ticket: t, idx = 0, onDeleteOptions, onOpenChildren, onOpenMerge, onStatusChange }) {
  const isCompleted = t.status === "Completed";
  const esc         = localStorage.getItem(`esc_${t.issue_key}`);

  return (
    <div
      id={`ticket-${t.issue_key}`}
      className="animate-slideUp bg-surface border border-purple/15 rounded-2xl overflow-hidden shadow-lg hover:border-purple/30 transition-all duration-200"
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface2 border-b border-purple/15">
        <div className="flex items-center gap-2">
          <span className="font-mono text-yellow text-sm font-bold">{t.issue_key || "-"}</span>
          {t.child_count > 0 && (
            <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded-full bg-purple/10 border border-purple/20 text-purple">
              {t.child_count} child
            </span>
          )}
        </div>
        <StatusBadge isCompleted={isCompleted} />
      </div>

      {/* ESCALATION ROW */}
      {!isCompleted && (
        <div className={`px-4 py-2 border-b border-purple/10 ${esc ? "bg-blue-900/10" : "bg-surface2"}`}>
          {esc ? (
            <span className="font-mono text-[0.65rem] text-white/90 bg-blue-700/30 px-2 py-0.5 rounded-full">
              🚀 Escalated to ({esc})
            </span>
          ) : (
            <span className="font-mono text-[0.65rem] text-yellow bg-yellow/10 px-2 py-0.5 rounded-full">
              Status: Assigned
            </span>
          )}
        </div>
      )}

      {/* BODY */}
      <div className="px-4 py-3 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <FieldLabel label="Name">
            <span className="text-slate-200 text-xs">{t.name || "-"}</span>
          </FieldLabel>
          <FieldLabel label="Email">
            <span className="text-slate-200 text-xs truncate block">{t.email || "-"}</span>
          </FieldLabel>
        </div>

        <FieldLabel label="Summary">
          <span className="text-slate-200 text-xs">{t.summary || "-"}</span>
        </FieldLabel>

        <FieldLabel label="Description">
          <span className="text-slate-300 text-xs leading-relaxed line-clamp-2">{t.description || "-"}</span>
        </FieldLabel>

        {/* STATUS SELECT */}
        {!isCompleted && (
          <div className="flex items-center gap-2 pt-1">
            <span className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">Update Status</span>
            <select
              onChange={e => onStatusChange(t.issue_key, e.target.value)}
              className="bg-surface2 border border-purple/20 text-slate-200 rounded-lg px-2 py-1 font-mono text-xs outline-none"
            >
              <option value="Open">Open</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="px-4 py-3 border-t border-purple/10 flex items-center gap-2">
        <button
          onClick={() => window.open(`/runbooks?id=${t.issue_key}`, "_blank")}
          className="flex-1 bg-purple/15 hover:bg-purple/25 border border-purple/20 text-purple text-[0.65rem] font-bold py-2 px-3 rounded-xl font-mono transition-all duration-200 hover:scale-[1.02]"
        >
          ⚙ Runbook
        </button>
        <button
          onClick={() => onOpenChildren(t.issue_key)}
          className="flex-1 bg-surface2 hover:bg-white/5 border border-purple/15 text-slate-300 text-[0.65rem] font-bold py-2 px-3 rounded-xl font-mono transition-all duration-200 hover:scale-[1.02]"
        >
          👥 Child
        </button>
        <button
          onClick={() => onOpenMerge(t.issue_key)}
          className="flex-1 bg-yellow/10 hover:bg-yellow/20 border border-yellow/20 text-yellow text-[0.65rem] font-bold py-2 px-3 rounded-xl font-mono transition-all"
        >
          🔀 Merge
        </button>
        <button
          onClick={() => onDeleteOptions(t.issue_key)}  
          className="bg-red/10 hover:bg-red/20 border border-red/20 text-red text-[0.65rem] font-bold py-2 px-3 rounded-xl font-mono transition-all duration-200 hover:scale-[1.02]"
        >
          🗑
        </button>
      </div>
    </div>
  );
}