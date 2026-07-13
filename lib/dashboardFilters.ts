import type { SerializedTrade } from "@/lib/serialize";

export type RangeKey = "7d" | "30d" | "90d" | "ytd" | "all";

export const DEFAULT_RANGE: RangeKey = "all";
export const DEFAULT_PAIR = "all";
export const DEFAULT_SETUP = "all";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All time" },
];

function isRangeKey(value: string | null): value is RangeKey {
  return value != null && RANGE_OPTIONS.some((o) => o.key === value);
}

export function parseRangeParam(value: string | null): RangeKey {
  return isRangeKey(value) ? value : DEFAULT_RANGE;
}

function daysAgoUTC(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function rangeCutoff(range: RangeKey): string | null {
  switch (range) {
    case "7d":
      return daysAgoUTC(7);
    case "30d":
      return daysAgoUTC(30);
    case "90d":
      return daysAgoUTC(90);
    case "ytd":
      return `${new Date().getUTCFullYear()}-01-01`;
    case "all":
      return null;
  }
}

/** Normalizes a trade's setup the same way lib/stats.ts groupBySetup does, so dropdown values and filtering agree. */
export function normalizeSetup(setup: string | null): string {
  return setup?.trim() || "Unlabeled";
}

export function getDistinctPairs(trades: SerializedTrade[]): string[] {
  return Array.from(new Set(trades.map((t) => t.pair))).sort((a, b) => a.localeCompare(b));
}

export function getDistinctSetups(trades: SerializedTrade[]): string[] {
  return Array.from(new Set(trades.map((t) => normalizeSetup(t.setup)))).sort((a, b) => a.localeCompare(b));
}

export interface DashboardFilterState {
  range: RangeKey;
  pair: string;
  setup: string;
}

export function filterTrades(trades: SerializedTrade[], filters: DashboardFilterState): SerializedTrade[] {
  const cutoff = rangeCutoff(filters.range);
  return trades.filter((t) => {
    if (cutoff != null && t.tradeDate < cutoff) return false;
    if (filters.pair !== DEFAULT_PAIR && t.pair !== filters.pair) return false;
    if (filters.setup !== DEFAULT_SETUP && normalizeSetup(t.setup) !== filters.setup) return false;
    return true;
  });
}
