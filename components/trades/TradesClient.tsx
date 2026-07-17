"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { SerializedTrade } from "@/lib/serialize";
import { deleteTrade } from "@/lib/actions/trades";
import TradeForm from "./TradeForm";
import EmptyState from "@/components/EmptyState";

interface FilterValues {
  pairs: string[];
  sessions: string[];
  setups: string[];
}

interface CurrentFilters {
  pair?: string;
  session?: string;
  setup?: string;
  result?: string;
  dateFrom?: string;
  dateTo?: string;
}

type SortKey = "tradeDate" | "pnl" | "pair";

interface ListItem {
  id: string;
  name: string;
}

interface Props {
  userId: string;
  trades: SerializedTrade[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: CurrentFilters;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  filterValues: FilterValues;
  lastTrade: SerializedTrade | null;
  sessions: ListItem[];
  setups: ListItem[];
}

interface PendingDelete {
  ids: string[];
  message: string;
}

function formatMoney(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />;
}

const INITIAL_VISIBLE = 11;
const REVEAL_BATCH = 11;
const UNDO_WINDOW_MS = 5000;
const EXIT_TRANSITION_MS = 200;

export default function TradesClient({
  userId,
  trades,
  totalCount,
  page,
  pageSize,
  totalPages,
  filters,
  sortBy,
  sortDir,
  filterValues,
  lastTrade,
  sessions,
  setups,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<SerializedTrade | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<SerializedTrade | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<PendingDelete | null>(null);
  const [toastEntered, setToastEntered] = useState(false);
  const [deleteBtnMounted, setDeleteBtnMounted] = useState(false);
  const [deleteBtnEntered, setDeleteBtnEntered] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const lastClickedIndexRef = useRef<number | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `trades` is a fresh array from the server on every filter/sort/page change,
  // so resetting on its identity collapses the reveal state back to the first batch
  // and clears any selection made against the previous result set.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
    setSelectedIds(new Set());
    setPendingDeleteIds(new Set());
  }, [trades]);

  // Clear any pending undo timer if the component unmounts mid-countdown.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const displayTrades = trades.filter((t) => !pendingDeleteIds.has(t.id));
  const visibleTrades = displayTrades.slice(0, visibleCount);
  const hasMore = visibleCount < displayTrades.length;

  const allVisibleSelected = visibleTrades.length > 0 && visibleTrades.every((t) => selectedIds.has(t.id));
  const someVisibleSelected = visibleTrades.some((t) => selectedIds.has(t.id));
  const hasSelection = selectedIds.size > 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  // Mounts the "Delete selected" button immediately on selection, but keeps it mounted
  // briefly after selection clears so the fade/slide-out transition can play instead of
  // an abrupt pop-out.
  useEffect(() => {
    if (hasSelection) {
      setDeleteBtnMounted(true);
      const raf = requestAnimationFrame(() => setDeleteBtnEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setDeleteBtnEntered(false);
    const t = setTimeout(() => setDeleteBtnMounted(false), EXIT_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [hasSelection]);

  // Escape clears the current selection (unless a modal is open, so it doesn't fight
  // with dialog dismissal).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !modalOpen && !bulkDeleteOpen && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, bulkDeleteOpen, selectedIds.size]);

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleTrades.forEach((t) => next.delete(t.id));
      } else {
        visibleTrades.forEach((t) => next.add(t.id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Shift+Click a row checkbox to select the range between it and the last-clicked row. */
  function handleRowCheckboxClick(e: React.MouseEvent<HTMLInputElement>, index: number) {
    if (e.shiftKey && lastClickedIndexRef.current !== null) {
      e.preventDefault();
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const rangeIds = visibleTrades.slice(start, end + 1).map((t) => t.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    }
    lastClickedIndexRef.current = index;
  }

  const hasFilters = !!(
    filters.pair ||
    filters.session ||
    filters.setup ||
    filters.result ||
    filters.dateFrom ||
    filters.dateTo
  );

  /** Pushes a URL with the given params merged in. Omitting "page" from the patch resets pagination to page 1. */
  function navigate(patch: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    const isPageChange = Object.prototype.hasOwnProperty.call(patch, "page");
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    if (!isPageChange) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function openNew() {
    setEditingTrade(null);
    setDuplicateSeed(null);
    setModalOpen(true);
  }

  function openDuplicate() {
    setEditingTrade(null);
    setDuplicateSeed(lastTrade);
    setModalOpen(true);
  }

  function openEdit(trade: SerializedTrade) {
    setEditingTrade(trade);
    setDuplicateSeed(null);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    router.refresh();
  }

  function dismissToast() {
    setToastEntered(false);
    setTimeout(() => setToast(null), EXIT_TRANSITION_MS);
  }

  function finalizeDelete(ids: string[]) {
    setIsDeleting(true);
    startTransition(async () => {
      await Promise.all(ids.map((id) => deleteTrade(id)));
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setIsDeleting(false);
      dismissToast();
      router.refresh();
    });
  }

  /** Optimistically hides the given trades and shows an undo toast; the real delete
   *  only fires once the toast's countdown elapses without the user hitting Undo. */
  function softDelete(ids: string[]) {
    if (ids.length === 0) return;

    // Only one undo window is tracked at a time — if another is already pending,
    // finalize it immediately before starting the new one.
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
      if (toast) finalizeDelete(toast.ids);
    }

    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    setToast({ ids, message: `${ids.length} trade${ids.length === 1 ? "" : "s"} deleted` });
    setToastEntered(false);
    requestAnimationFrame(() => setToastEntered(true));

    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      finalizeDelete(ids);
    }, UNDO_WINDOW_MS);
  }

  function undoDelete() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (toast) {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        toast.ids.forEach((id) => next.delete(id));
        return next;
      });
    }
    dismissToast();
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this trade? This cannot be undone.")) return;
    softDelete([id]);
  }

  function openBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
  }

  function closeBulkDelete() {
    setBulkDeleteOpen(false);
  }

  function confirmBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleteOpen(false);
    softDelete(ids);
  }

  function toggleSort(key: SortKey) {
    const nextDir = sortBy === key && sortDir === "desc" ? "asc" : "desc";
    navigate({ sortBy: key, sortDir: nextDir });
  }

  function sortIndicator(key: SortKey) {
    if (sortBy !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function goToPage(p: number) {
    navigate({ page: p });
  }

  function showMore() {
    setVisibleCount((c) => Math.min(c + REVEAL_BATCH, displayTrades.length));
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + visibleTrades.length, totalCount);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-white">Trades</h1>
          <p className="text-sm text-slate-400">
            {totalCount === 0
              ? "0 logged trades"
              : `Showing ${rangeStart}-${rangeEnd} of ${totalCount} trade${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {deleteBtnMounted && (
            <button
              onClick={openBulkDelete}
              disabled={isDeleting}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-loss/40 bg-loss px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-loss/90 disabled:cursor-not-allowed disabled:opacity-60 ${
                deleteBtnEntered ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
              }`}
            >
              {isDeleting && <Spinner />}
              Delete selected ({selectedIds.size})
            </button>
          )}
          {lastTrade && (
            <button onClick={openDuplicate} className="btn-secondary">
              Duplicate last trade
            </button>
          )}
          <button onClick={openNew} className="btn-primary">
            + Log trade
          </button>
        </div>
      </div>

      {(totalCount > 0 || hasFilters) && (
        <div className="glass-card flex flex-wrap gap-3 p-4">
          <select
            value={filters.pair ?? ""}
            onChange={(e) => navigate({ pair: e.target.value })}
            className="input-field w-auto"
          >
            <option value="">All pairs</option>
            {filterValues.pairs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={filters.session ?? ""}
            onChange={(e) => navigate({ session: e.target.value })}
            className="input-field w-auto"
          >
            <option value="">All sessions</option>
            {filterValues.sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.setup ?? ""}
            onChange={(e) => navigate({ setup: e.target.value })}
            className="input-field w-auto"
          >
            <option value="">All setups</option>
            {filterValues.setups.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.result ?? ""}
            onChange={(e) => navigate({ result: e.target.value })}
            className="input-field w-auto"
          >
            <option value="">All results</option>
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
          </select>
          <div className="flex items-center gap-1.5">
            <label htmlFor="dateFrom" className="text-xs text-slate-500">
              From
            </label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => navigate({ dateFrom: e.target.value })}
              className="input-field w-auto font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="dateTo" className="text-xs text-slate-500">
              To
            </label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => navigate({ dateTo: e.target.value })}
              className="input-field w-auto font-mono"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() =>
                navigate({
                  pair: undefined,
                  session: undefined,
                  setup: undefined,
                  result: undefined,
                  dateFrom: undefined,
                  dateTo: undefined,
                })
              }
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {totalCount === 0 && !hasFilters ? (
        <EmptyState
          icon="📝"
          title="No trades yet"
          description="Log your first trade to get started tracking your performance."
          actionLabel="+ Log trade"
          onAction={openNew}
        />
      ) : totalCount === 0 ? (
        <EmptyState
          icon="🔍"
          title="No trades match these filters"
          description="Try clearing a filter to see more of your trade history."
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <button onClick={toggleSelectAll} className="text-sm font-medium text-neutral hover:underline">
              {allVisibleSelected ? "Deselect all" : "Select all"}
            </button>
            {someVisibleSelected && <span className="text-xs text-slate-500">({selectedIds.size} selected)</span>}
          </div>
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                <th className="w-10 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="checkbox-field"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all visible trades"
                  />
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("tradeDate")}>Date{sortIndicator("tradeDate")}</button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("pair")}>Pair{sortIndicator("pair")}</button>
                </th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Dir</th>
                <th className="px-4 py-3">Setup</th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("pnl")}>P&amp;L{sortIndicator("pnl")}</button>
                </th>
                <th className="px-4 py-3">R</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTrades.map((t, index) => (
                <tr
                  key={t.id}
                  className={`border-b border-border/60 transition-colors duration-200 hover:bg-white/[0.02] ${
                    selectedIds.has(t.id) ? "bg-neutral/[0.07]" : ""
                  }`}
                >
                  <td
                    className={`border-l-[3px] px-4 py-3 ${t.result === "Win" ? "border-l-win" : "border-l-loss"}`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-field"
                      checked={selectedIds.has(t.id)}
                      onClick={(e) => handleRowCheckboxClick(e, index)}
                      onChange={() => toggleRow(t.id)}
                      aria-label={`Select trade ${t.pair} on ${t.tradeDate}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{t.tradeDate}</td>
                  <td className="px-4 py-3 font-medium text-white">{t.pair}</td>
                  <td className="px-4 py-3 text-slate-400">{t.session}</td>
                  <td className="px-4 py-3 text-slate-400">{t.direction}</td>
                  <td className="px-4 py-3 text-slate-400">{t.setup ?? "—"}</td>
                  <td className={`px-4 py-3 font-mono ${t.pnl >= 0 ? "text-win" : "text-loss"}`}>
                    {formatMoney(t.pnl)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {t.rMultiple != null ? `${t.rMultiple}R` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={t.result === "Win" ? "badge-win" : "badge-loss"}>{t.result}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(t)} className="text-neutral hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="ml-3 text-loss hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div className="flex justify-center border-t border-border px-4 py-3">
              <button onClick={showMore} className="btn-secondary">
                Show more
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <TradeForm
          userId={userId}
          initialTrade={editingTrade}
          duplicateSeed={duplicateSeed}
          knownPairs={filterValues.pairs}
          sessions={sessions}
          setups={setups}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {bulkDeleteOpen &&
        createPortal(
          <div className="modal-overlay">
            <div className="modal-card w-full max-w-md animate-fade-up">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 pb-5 pt-7">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-loss-soft text-base">
                  ⚠️
                </div>
                <h2 className="font-sans text-lg font-semibold text-white">Delete selected trades?</h2>
              </div>

              <div className="space-y-4 px-6 pb-7 pt-5">
                <p className="text-sm text-slate-300">
                  Delete {selectedIds.size} selected trade{selectedIds.size === 1 ? "" : "s"}? This cannot be
                  undone.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={closeBulkDelete} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="inline-flex items-center justify-center rounded-lg border border-loss/40 bg-loss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-loss/90"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {toast &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div
              className={`glass-card pointer-events-auto relative flex items-center gap-4 overflow-hidden px-4 py-3 shadow-2xl transition-all duration-200 ease-out ${
                toastEntered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <span className="text-sm text-white">{toast.message}</span>
              <button onClick={undoDelete} className="text-sm font-medium text-neutral hover:underline">
                Undo
              </button>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                <div key={toast.ids.join(",")} className="toast-progress h-full bg-loss" />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
