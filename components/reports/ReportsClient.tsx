"use client";

import { useMemo, useState } from "react";
import type { SerializedTrade } from "@/lib/serialize";
import { computeTradeStats, groupByPair, groupBySetup, groupBySession } from "@/lib/stats";
import { round2 } from "@/lib/calculations";
import { getPeriodRange, getPreviousEqualRange, shiftAnchor, type PeriodType, type PeriodRange } from "@/lib/periods";
import { formatMoney, formatPercent, formatR } from "@/lib/format";
import KpiCard from "@/components/KpiCard";
import DeltaBadge from "@/components/DeltaBadge";
import EmptyState from "@/components/EmptyState";
import PeriodBarChart from "./PeriodBarChart";
import PairPerformanceBars from "@/components/dashboard/PairPerformanceBars";
import SetupPerformanceGrid from "@/components/dashboard/SetupPerformanceGrid";
import SessionBreakdown from "@/components/dashboard/SessionBreakdown";

interface Props {
  trades: SerializedTrade[];
  startingBalance: number;
}

const PERIOD_TYPES: PeriodType[] = ["daily", "weekly", "monthly", "yearly"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function tradesInRange(trades: SerializedTrade[], start: Date, end: Date) {
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);
  return trades.filter((t) => t.tradeDate >= startISO && t.tradeDate < endISO);
}

/**
 * P&L per day (daily/weekly/monthly) or per month (yearly) across the
 * selected period. For yearly, each month with trades also gets a % return
 * relative to the account balance at the start of that specific month
 * (startingBalance + all P&L from trades dated before that month).
 */
function buildPeriodBars(
  periodType: PeriodType,
  range: PeriodRange,
  currentTrades: SerializedTrade[],
  allTrades: SerializedTrade[],
  startingBalance: number
) {
  if (periodType === "yearly") {
    const byMonth = new Map<number, number>();
    for (const t of currentTrades) {
      const month = Number(t.tradeDate.slice(5, 7)) - 1;
      byMonth.set(month, (byMonth.get(month) ?? 0) + t.pnl);
    }
    const year = range.start.getUTCFullYear();
    return MONTH_LABELS.map((label, i) => {
      if (!byMonth.has(i)) return { label, value: 0, percentage: null as number | null };

      const monthPnl = round2(byMonth.get(i)!);
      const monthStartISO = `${year}-${String(i + 1).padStart(2, "0")}-01`;
      const pnlBeforeMonth = allTrades
        .filter((t) => t.tradeDate < monthStartISO)
        .reduce((sum, t) => sum + t.pnl, 0);
      const balanceAtStart = startingBalance + pnlBeforeMonth;
      const percentage = balanceAtStart !== 0 ? round2((monthPnl / balanceAtStart) * 100) : null;

      return { label, value: monthPnl, percentage };
    });
  }

  const byDay = new Map<string, number>();
  for (const t of currentTrades) {
    byDay.set(t.tradeDate, (byDay.get(t.tradeDate) ?? 0) + t.pnl);
  }

  const bars: { label: string; value: number }[] = [];
  const cursor = new Date(range.start);
  while (cursor < range.end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    bars.push({ label: String(cursor.getUTCDate()), value: round2(byDay.get(dateStr) ?? 0) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return bars;
}

export default function ReportsClient({ trades, startingBalance }: Props) {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [anchor, setAnchor] = useState(new Date());

  const range = useMemo(() => getPeriodRange(periodType, anchor), [periodType, anchor]);
  const prevRange = useMemo(() => getPreviousEqualRange(range), [range]);

  const currentTrades = useMemo(() => tradesInRange(trades, range.start, range.end), [trades, range]);
  const prevTrades = useMemo(
    () => tradesInRange(trades, prevRange.start, prevRange.end),
    [trades, prevRange]
  );

  const stats = useMemo(() => computeTradeStats(currentTrades), [currentTrades]);
  const prevStats = useMemo(() => computeTradeStats(prevTrades), [prevTrades]);

  const periodBars = useMemo(
    () => buildPeriodBars(periodType, range, currentTrades, trades, startingBalance),
    [periodType, range, currentTrades, trades, startingBalance]
  );
  const ytdReturn =
    periodType === "yearly" && startingBalance > 0 ? round2((stats.totalPnl / startingBalance) * 100) : null;
  const pairData = useMemo(() => groupByPair(currentTrades), [currentTrades]);
  const setupData = useMemo(() => groupBySetup(currentTrades), [currentTrades]);
  const sessionData = useMemo(() => groupBySession(currentTrades), [currentTrades]);

  const isCurrentPeriod = range.end.getTime() > Date.now();
  const isSingleTradePeriod = !!(stats.bestTrade && stats.worstTrade && stats.bestTrade.id === stats.worstTrade.id);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-white">Reports</h1>
        <p className="text-sm text-slate-400">Performance broken down by period, compared to the prior period.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-black/20 p-1">
          {PERIOD_TYPES.map((p) => (
            <button
              key={p}
              onClick={() => setPeriodType(p)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                periodType === p ? "bg-neutral text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor((a) => shiftAnchor(periodType, a, -1))}
            className="btn-secondary px-3"
            aria-label="Previous period"
          >
            ←
          </button>
          <span className="min-w-0 max-w-[160px] truncate text-center text-sm font-medium text-slate-200 sm:max-w-[220px]">
            {range.label}
          </span>
          <button
            onClick={() => setAnchor((a) => shiftAnchor(periodType, a, 1))}
            disabled={isCurrentPeriod}
            className="btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next period"
          >
            →
          </button>
        </div>
      </div>

      {currentTrades.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="No trades in this period"
          description="Switch periods or navigate to a range that has logged trades."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total P&L"
              value={formatMoney(stats.totalPnl)}
              valueClassName={stats.totalPnl >= 0 ? "text-win" : "text-loss"}
              sub={<DeltaBadge current={stats.totalPnl} previous={prevStats.totalPnl} format={formatMoney} />}
            />
            <KpiCard
              label="Win rate"
              value={formatPercent(stats.winRate)}
              sub={
                <DeltaBadge
                  current={stats.winRate}
                  previous={prevStats.winRate}
                  format={(v) => `${v.toFixed(1)}pp`}
                />
              }
            />
            <KpiCard
              label="W / L record"
              value={`${stats.wins}W / ${stats.losses}L`}
              sub={<span className="text-xs text-slate-500">{stats.count} total trades</span>}
            />
            <KpiCard
              label="Profit factor"
              value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "∞"}
              valueClassName="text-gold"
              sub={
                stats.profitFactor == null ? (
                  <span className="text-xs text-slate-500">No losses yet — undefeated this period</span>
                ) : prevStats.profitFactor != null ? (
                  <DeltaBadge current={stats.profitFactor} previous={prevStats.profitFactor} />
                ) : (
                  <span className="text-xs text-slate-500">No prior period to compare</span>
                )
              }
            />
            <KpiCard
              label="Avg R multiple"
              value={stats.avgRMultiple != null ? formatR(stats.avgRMultiple) : "—"}
              sub={
                stats.avgRMultiple != null && prevStats.avgRMultiple != null ? (
                  <DeltaBadge
                    current={stats.avgRMultiple}
                    previous={prevStats.avgRMultiple}
                    format={(v) => `${v.toFixed(2)}R`}
                  />
                ) : undefined
              }
            />
            <KpiCard
              label="Expectancy"
              value={stats.expectancy != null ? formatMoney(stats.expectancy) : "—"}
              valueClassName={
                stats.expectancy != null ? (stats.expectancy >= 0 ? "text-win" : "text-loss") : "text-white"
              }
              sub={<span className="text-xs text-slate-500">Expected $ per trade</span>}
            />
            <KpiCard
              label="Best trade"
              value={stats.bestTrade ? formatMoney(stats.bestTrade.pnl) : "—"}
              valueClassName={stats.bestTrade ? (stats.bestTrade.pnl >= 0 ? "text-win" : "text-loss") : "text-white"}
              sub={
                stats.bestTrade ? (
                  <div className="space-y-0.5">
                    <span className="block text-xs text-slate-500">
                      {stats.bestTrade.pair} · {stats.bestTrade.tradeDate}
                    </span>
                    {isSingleTradePeriod && (
                      <span className="block text-xs text-slate-600">Only trade this period</span>
                    )}
                  </div>
                ) : undefined
              }
            />
            <KpiCard
              label="Worst trade"
              value={stats.worstTrade ? formatMoney(stats.worstTrade.pnl) : "—"}
              valueClassName={
                stats.worstTrade ? (stats.worstTrade.pnl >= 0 ? "text-win" : "text-loss") : "text-white"
              }
              sub={
                stats.worstTrade ? (
                  <div className="space-y-0.5">
                    <span className="block text-xs text-slate-500">
                      {stats.worstTrade.pair} · {stats.worstTrade.tradeDate}
                    </span>
                    {isSingleTradePeriod && (
                      <span className="block text-xs text-slate-600">Only trade this period</span>
                    )}
                  </div>
                ) : undefined
              }
            />
          </div>

          {periodType !== "daily" && (
            <PeriodBarChart
              title={periodType === "yearly" ? "P&L by month" : "P&L by day"}
              bars={periodBars}
              subtitle={
                ytdReturn != null ? (
                  <span className={`text-sm font-bold ${ytdReturn >= 0 ? "text-win" : "text-loss"}`}>
                    Year-to-date: {ytdReturn >= 0 ? "+" : ""}
                    {ytdReturn.toFixed(1)}%
                  </span>
                ) : undefined
              }
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SetupPerformanceGrid data={setupData} />
            <PairPerformanceBars data={pairData} />
          </div>

          <SessionBreakdown data={sessionData} />
        </>
      )}
    </div>
  );
}
