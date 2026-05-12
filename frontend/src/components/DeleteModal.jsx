export default function DeleteModal({ issueKey, onClose, onDeleteParentOnly, onDeleteCascade }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-purple/15 rounded-2xl w-[420px] p-6 shadow-2xl animate-slideUp">

        <h2 className="text-red font-bold text-lg mb-2">Delete Ticket</h2>
        <p className="text-sm text-muted mb-6">Choose deletion strategy</p>

        <div className="space-y-3">
          <button
            onClick={() => onDeleteParentOnly(issueKey)}
            className="w-full bg-yellow/10 hover:bg-yellow/20 border border-yellow/20 text-yellow py-3 rounded-xl text-sm font-bold transition-all"
          >
            Delete Parent Only
          </button>
          <button
            onClick={() => onDeleteCascade(issueKey)}
            className="w-full bg-red/10 hover:bg-red/20 border border-red/20 text-red py-3 rounded-xl text-sm font-bold transition-all"
          >
            Delete Parent + All Children
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-surface2 hover:bg-white/5 py-2 rounded-xl text-sm transition-all"
        >
          Cancel
        </button>

      </div>
    </div>
  );
}