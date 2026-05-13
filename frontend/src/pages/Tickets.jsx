import { useEffect }    from "react";
import { useTickets }   from "../hooks/useTickets";
import { useRca }       from "../hooks/useRca";
import TicketCard       from "../components/TicketCard";
import ChildModal       from "../components/ChildModal";
import MergeModal       from "../components/MergeModal";
import DeleteModal      from "../components/DeleteModal";
import RcaModal         from "../components/RcaModal";

export default function Tickets() {
  const {
    tickets, loading, loadTickets,
    updateStatus,
    // delete
    deleteModal, openDeleteModal, closeDeleteModal,
    deleteParentCascade, deleteParentOnly, deleteSingleChild,
    // child modal
    childModal, openChildModal, closeChildModal, detachChild,
    // merge modal
    mergeModal, mergeTickets, openMergeModal, closeMergeModal, executeMerge,
  } = useTickets();

  const {
    rcaModal, rcaData, rcaLoading, rcaError,
    openRcaModal, closeRcaModal, submitHuman,
  } = useRca();

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // ── HIGHLIGHT SEARCHED TICKET ──
  useEffect(() => {
    if (loading) return;
    const highlightKey = localStorage.getItem("highlight_ticket");
    if (!highlightKey) return;

    const card = document.getElementById(`ticket-${highlightKey}`);
    if (!card) return;

    setTimeout(() => {
      card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setTimeout(() => {
        card.classList.add("ring-4", "ring-yellow-400", "scale-[1.02]", "transition-all", "duration-300");
      }, 400);
    }, 300);

    setTimeout(() => {
      card.classList.remove("ring-4", "ring-yellow-400", "scale-[1.02]");
      localStorage.removeItem("highlight_ticket");
    }, 3000);
  }, [loading, tickets]);

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 pb-16">

      {/* Header */}
      <div className="flex items-center justify-center mb-8 pb-6 border-b border-purple/15">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-purple tracking-tight">🎫 Tickets System</h1>
          <p className="font-mono text-muted text-xs mt-1">Dashboard View</p>
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-surface border border-purple/15 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-surface2 rounded w-1/3 mb-4" />
              <div className="h-3 bg-surface2 rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface2 rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface2 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && tickets.length === 0 && (
        <div className="font-mono text-center py-16 text-muted text-sm col-span-2">
          <div className="text-4xl mb-4">📭</div>
          <div>No tickets found</div>
        </div>
      )}

      {/* Grid */}
      {!loading && tickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map((t, idx) => (
            <TicketCard
              key={t.issue_key}
              ticket={t}
              idx={idx}
              onDeleteOptions={openDeleteModal}
              onOpenChildren={openChildModal}
              onOpenMerge={openMergeModal}
              onStatusChange={updateStatus}
              onOpenRca={openRcaModal}
            />
          ))}
        </div>
      )}

      {/* Child Modal */}
      {childModal && (
        <ChildModal
          parentKey={childModal.parentKey}
          children={childModal.children}
          onClose={closeChildModal}
          onDetach={detachChild}
          onDeleteChild={deleteSingleChild}
        />
      )}

      {/* Merge Modal */}
      {mergeModal && (
        <MergeModal
          targetKey={mergeModal.targetKey}
          tickets={mergeTickets}
          onClose={closeMergeModal}
          onMerge={executeMerge}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <DeleteModal
          issueKey={deleteModal.issueKey}
          onClose={closeDeleteModal}
          onDeleteParentOnly={deleteParentOnly}
          onDeleteCascade={deleteParentCascade}
        />
      )}

      {/* RCA Modal */}
      {rcaModal && (
        <RcaModal
          issueKey={rcaModal.issueKey}
          data={rcaData}
          loading={rcaLoading}
          error={rcaError}
          onClose={closeRcaModal}
          onSubmitHuman={(rootCause, affected) =>
            submitHuman(rcaModal.issueKey, { rootCause, affected })
          }
        />
      )}

    </div>
  );
}