import { requireUserId } from "@/lib/session";
import {
  getTradesForUser,
  getDistinctFilterValues,
  getLastTrade,
  DEFAULT_TRADES_PAGE_SIZE,
  type TradeFilters,
} from "@/lib/data/trades";
import { serializeTrades, serializeTrade } from "@/lib/serialize";
import { getSessionsForUser, getSetupsForUser } from "@/lib/data/lists";
import TradesClient from "@/components/trades/TradesClient";

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Only sort keys the UI actually exposes controls for; anything else (including
// "createdAt", which is data-layer-only) falls back to the default.
const SORTABLE_KEYS = ["tradeDate", "pair", "pnl"] as const;
type UiSortKey = (typeof SORTABLE_KEYS)[number];

function parseSortBy(v: string | undefined): UiSortKey {
  return (SORTABLE_KEYS as readonly string[]).includes(v ?? "") ? (v as UiSortKey) : "tradeDate";
}

function parseSortDir(v: string | undefined): "asc" | "desc" {
  return v === "asc" ? "asc" : "desc";
}

export default async function TradesPage({ searchParams }: Props) {
  const userId = await requireUserId();

  const sortBy = parseSortBy(firstParam(searchParams.sortBy));
  const sortDir = parseSortDir(firstParam(searchParams.sortDir));
  const page = Number(firstParam(searchParams.page) ?? "1") || 1;

  const filters: TradeFilters = {
    pair: firstParam(searchParams.pair) || undefined,
    session: firstParam(searchParams.session) || undefined,
    setup: firstParam(searchParams.setup) || undefined,
    result: firstParam(searchParams.result) || undefined,
    dateFrom: firstParam(searchParams.dateFrom) || undefined,
    dateTo: firstParam(searchParams.dateTo) || undefined,
    sortBy,
    sortDir,
    page,
    pageSize: DEFAULT_TRADES_PAGE_SIZE,
  };

  const [tradesPage, filterValues, lastTrade, sessions, setups] = await Promise.all([
    getTradesForUser(userId, filters),
    getDistinctFilterValues(userId),
    getLastTrade(userId),
    getSessionsForUser(userId),
    getSetupsForUser(userId),
  ]);

  return (
    <TradesClient
      userId={userId}
      trades={serializeTrades(tradesPage.trades)}
      totalCount={tradesPage.totalCount}
      page={tradesPage.page}
      pageSize={tradesPage.pageSize}
      totalPages={tradesPage.totalPages}
      filters={{
        pair: filters.pair,
        session: filters.session,
        setup: filters.setup,
        result: filters.result,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }}
      sortBy={sortBy}
      sortDir={sortDir}
      filterValues={filterValues}
      lastTrade={lastTrade ? serializeTrade(lastTrade) : null}
      sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
      setups={setups.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
