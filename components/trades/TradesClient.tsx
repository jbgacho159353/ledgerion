"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { SerializedTrade } from "@/lib/serialize";
import { deleteTrade, deleteAllTrades } from "@/lib/actions/trades";
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
  allTradesCount: number;
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

function formatMoney(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const INITIAL_VISIBLE = 11;
const REVEAL_BATCH = 11;

export default function TradesClient({
  userId,
  trades,
  totalCount,
  allTradesCount,
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
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllAck, setDeleteAllAck] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // `trades` is a fresh array from the server on every filter/sort/page change,
  // so resetting on its identity collapses the reveal state back to the first batch
  // and clears any selection made against the previous result set.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
    setSelectedIds(new Set());
  }, [trades]);

  const visibleTrades = trades.slice(0, visibleCount);
  const hasMore = visibleCount < trades.length;

  const allVisibleSelected = visibleTrades.length > 0 && visibleTrades.every((t) => selectedIds.has(t.id));
  const someVisibleSelected = visibleTrades.some((t) => selectedIds.has(t.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

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

  function clearSelection() {
    setSelectedIds(new Set());
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

  function handleDelete(id: string) {
    if (!window.confirm("Delete this trade? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteTrade(id);
      router.refresh();
    });
  }

  function handleSaved() {
    setModalOpen(false);
    router.refresh();
  }

  function handleBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`Delete ${count} trade${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    const ids = Array.from(selectedIds);
    setIsBulkDeleting(true);
    startTransition(async () => {
      await Promise.all(ids.map((id) => deleteTrade(id)));
      setIsBulkDeleting(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function openDeleteAll() {
    setDeleteAllAck(false);
    setDeleteAllOpen(true);
  }

  function closeDeleteAll() {
    if (isDeletingAll) return;
    setDeleteAllOpen(false);
    setDeleteAllAck(false);
  }

  function handleDeleteAll() {
    if (!deleteAllAck) return;
    setIsDeletingAll(true);
    startTransition(async () => {
      await deleteAllTrades();
      setIsDeletingAll(false);
      setDeleteAllOpen(false);
      setDeleteAllAck(false);
      setSelectedIds(new Set());
      // Clear any active filters/sort/page so the plain "log your first trade" empty state shows.
      router.push(pathname);
      router.refresh();
    });
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
    setVisibleCount((c) => Math.min(c + REVEAL_BATCH, trades.length));
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
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-loss/30 bg-loss-soft px-4 py-2">
            <span className="text-sm font-medium text-white">
              {selectedIds.size} trade{selectedIds.size === 1 ? "" : "s"} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="inline-flex items-center justify-center rounded-lg border border-loss/40 bg-loss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-loss/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBulkDeleting ? "Deleting…" : "Delete selected"}
            </button>
            <button onClick={clearSelection} disabled={isBulkDeleting} className="btn-secondary">
              Clear selection
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {allTradesCount > 0 && (
              <button
                onClick={openDeleteAll}
                className="inline-flex items-center justify-center rounded-lg border border-loss/40 px-4 py-2 text-sm font-medium text-loss transition-colors hover:bg-loss-soft"
              >
                Delete all
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
        )}
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
          title="Log your first trade"
          description="Your trade log is empty. Add your first trade to start tracking performance."
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
              {visibleTrades.map((t) => (
                <tr key={t.id} className="border-b border-border/60 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="checkbox-field"
                      checked={selectedIds.has(t.id)}
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
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="ml-3 text-loss hover:underline"
                    >
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

      {deleteAllOpen &&
        createPortal(
          <div className="modal-overlay">
            <div className="modal-card w-full max-w-md animate-fade-up">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 pb-5 pt-7">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-loss-soft text-base">
                  ⚠️
                </div>
                <h2 className="font-sans text-lg font-semibold text-white">Delete ALL trades?</h2>
              </div>

              <div className="space-y-4 px-6 pb-7 pt-5">
                <p className="text-sm text-slate-300">
                  This will permanently remove all {allTradesCount} trade{allTradesCount === 1 ? "" : "s"} and
                  cannot be undone.
                </p>

                <label className="flex items-start gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="checkbox-field mt-0.5"
                    checked={deleteAllAck}
                    onChange={(e) => setDeleteAllAck(e.target.checked)}
                  />
                  I understand this cannot be undone.
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={closeDeleteAll} disabled={isDeletingAll} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={!deleteAllAck || isDeletingAll}
                    className="inline-flex items-center justify-center rounded-lg border border-loss/40 bg-loss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-loss/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeletingAll ? "Deleting…" : "Delete all trades"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
