import StatusBadge from "./StatusBadge";
import FieldLabel  from "./FieldLabel";

export default function ChildModal({ parentKey, children, onClose, onDetach, onDeleteChild }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-purple/15 rounded-2xl w-[620px] max-h-[80vh] overflow-auto shadow-2xl animate-slideUp">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface2 border-b border-purple/15 sticky top-0">
          <div>
            <h2 className="font-bold text-purple">Child Tickets</h2>
            <p className="font-mono text-muted text-xs mt-0.5">Parent: {parentKey}</p>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-muted hover:text-slate-200 text-lg transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {children.length === 0 ? (
            <div className="font-mono text-center py-8 text-muted text-sm">
              <div className="text-3xl mb-3">📭</div>
              <div>No child tickets found</div>
            </div>
          ) : (
            children.map(c => (
              <div key={c.issue_key} className="bg-surface2 border border-purple/10 rounded-xl p-4 space-y-2">

                {/* Child header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-yellow text-xs font-bold">{c.issue_key}</span>
                    {c.child_key && (
                      <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded-full bg-yellow/10 border border-yellow/20 text-yellow">
                        {c.child_key}
                      </span>
                    )}
                  </div>
                  <StatusBadge isCompleted={c.status === "Completed"} />
                </div>

                {/* Child fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <FieldLabel label="Name"><span>{c.name || "-"}</span></FieldLabel>
                  <FieldLabel label="Email"><span>{c.email || "-"}</span></FieldLabel>
                  <FieldLabel label="Summary" className="col-span-2"><span>{c.summary || "-"}</span></FieldLabel>
                  <FieldLabel label="Description" className="col-span-2">
                    <span className="text-slate-300 leading-relaxed">{c.description || "-"}</span>
                  </FieldLabel>
                </div>

                {/* Actions — matches doc 23: both detach + delete */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => onDetach(c.issue_key)}
                    className="bg-green/10 hover:bg-green/20 border border-green/20 text-green text-[0.65rem] font-bold py-1.5 px-3 rounded-lg font-mono transition-all"
                  >
                    ➕ Create New Ticket
                  </button>
                  <button
                    onClick={() => onDeleteChild(c.issue_key)}
                    className="bg-red/10 hover:bg-red/20 border border-red/20 text-red text-[0.65rem] font-bold py-1.5 px-3 rounded-lg font-mono transition-all"
                  >
                    🗑 Delete
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}