import { useState, useCallback } from "react";
import { apiRequest } from "../api/apiClient";

export function useTickets() {
  const [tickets,      setTickets]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [childModal,   setChildModal]   = useState(null);
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [mergeModal,   setMergeModal]   = useState(null);
  const [mergeTickets, setMergeTickets] = useState([]);

  // ── LOAD ──
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/tickets");
      const all =
        Array.isArray(res)          ? res :
        Array.isArray(res?.tickets) ? res.tickets :
        Array.isArray(res?.data)    ? res.data : [];

      // Show only true parent tickets:
      //   • no parent_ticket_key  → not a child
      //   • is_duplicate === false → not a duplicate
      setTickets(
        all.filter(t => !t.parent_ticket_key && t.is_duplicate === false)
      );
    } catch (err) {
      console.error("❌ loadTickets error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── UPDATE STATUS ──
  const updateStatus = useCallback(async (issueKey, value) => {
    if (value !== "Completed") return;
    const res = await apiRequest(`/tickets/${issueKey}/complete`, "PUT");
    if (res?.error) { console.error("❌ Status update failed:", res.message); loadTickets(); return; }
    localStorage.removeItem(`esc_${issueKey}`);
    setTimeout(() => loadTickets(), 500);
  }, [loadTickets]);

  // ── DELETE MODAL ──
  const openDeleteModal  = useCallback((issueKey) => setDeleteModal({ issueKey }), []);

  // ── DELETE PARENT + ALL CHILDREN ──
  const deleteParentCascade = useCallback(async (issueKey) => {
    const res = await apiRequest(`/tickets/${issueKey}`, "DELETE");
    if (res?.error) { console.error("❌ Cascade delete failed:", res.message); return; }
    setDeleteModal(null);
    loadTickets();
  }, [loadTickets]);

  // ── DELETE PARENT ONLY ──
  const deleteParentOnly = useCallback(async (issueKey) => {
    const res = await apiRequest(`/tickets/${issueKey}/parent-only`, "DELETE");
    if (res?.error) { console.error("❌ Parent delete failed:", res.message); return; }
    setDeleteModal(null);
    loadTickets();
  }, [loadTickets]);

  // ── DELETE SINGLE CHILD ──
  const deleteSingleChild = useCallback(async (issueKey) => {
    const res = await apiRequest(`/tickets/child/${issueKey}`, "DELETE");
    if (res?.error) { console.error("❌ Child delete failed:", res.message); return; }
    setChildModal(null);
    loadTickets();
  }, [loadTickets]);

  // ── CHILD MODAL ──
  const openChildModal = useCallback(async (parentKey) => {
    const res = await apiRequest("/tickets");
    const all =
      Array.isArray(res)          ? res :
      Array.isArray(res?.tickets) ? res.tickets :
      Array.isArray(res?.data)    ? res.data : [];
    const children = all.filter(t => t.parent_ticket_key === parentKey);
    setChildModal({ parentKey, children });
  }, []);

  const detachChild = useCallback(async (issueKey) => {
    const res = await apiRequest(`/tickets/${issueKey}/detach`, "PUT");
    if (res?.error) { console.error("❌ Detach failed:", res.message); return; }
    setChildModal(null);
    loadTickets();
  }, [loadTickets]);

  // ── MERGE MODAL ──
  const openMergeModal = useCallback(async (targetKey) => {
    const res = await apiRequest("/tickets");
    const all =
      Array.isArray(res)          ? res :
      Array.isArray(res?.tickets) ? res.tickets :
      Array.isArray(res?.data)    ? res.data : [];
    const parents = all.filter(t =>
      !t.parent_ticket_key && t.is_duplicate === false && t.issue_key !== targetKey
    );
    setMergeTickets(parents);
    setMergeModal({ targetKey });
  }, []);

  const executeMerge = useCallback(async (targetKey, sourceKey) => {
    const res = await apiRequest("/tickets/merge", "POST", {
      target_parent_key:  targetKey,
      source_parent_keys: [sourceKey],
    });
    console.log("Merge result:", res);
    setMergeModal(null);
    loadTickets();
  }, [loadTickets]);

  return {
    tickets, loading, loadTickets,
    updateStatus,
    deleteModal, openDeleteModal, closeDeleteModal: () => setDeleteModal(null),
    deleteParentCascade, deleteParentOnly, deleteSingleChild,
    childModal, openChildModal, closeChildModal: () => setChildModal(null), detachChild,
    mergeModal, mergeTickets, openMergeModal, closeMergeModal: () => setMergeModal(null), executeMerge,
  };
}