"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { SerializedTrade } from "@/lib/serialize";
import {
  computeTradeStats,
  groupByPair,
  groupBySetup,
  groupBySession,
  buildEquityCurve,
  computeMaxDrawdown,
  calculateStreak,
  buildRecentTrendSeries,
} from "@/lib/stats";
import {
  filterTrades,
  filterPreviousPeriodTrades,
  parseRangeParam,
  getDistinctPairs,
  getDistinctSetups,
  DEFAULT_PAIR,
  DEFAULT_SETUP,
} from "@/lib/dashboardFilters";
import { generateInsights, type Insight } from "@/lib/insights";
import { round2 } from "@/lib/calculations";
import { formatMoney, formatPercent, formatR, formatCurrency } from "@/lib/format";
import KpiCard from "@/components/KpiCard";
import Sparkline from "@/components/Sparkline";
import EquityCurve from "./EquityCurve";
import MaxDrawdownCard from "./MaxDrawdownCard";
import CalendarHeatmap from "./CalendarHeatmap";
import WinLossDonut from "./WinLossDonut";
import PairPerformanceBars from "./PairPerformanceBars";
import SetupPerformanceGrid from "./SetupPerformanceGrid";
import SessionBreakdown from "./SessionBreakdown";
import InsightsGrid from "./InsightsGrid";
import DashboardFilters from "./DashboardFilters";

const SMALL_SAMPLE_THRESHOLD = 20;
const LOW_SAMPLE_CARD_THRESHOLD = 10;
const MIN_TREND_TRADES = 3;

/** Small pill flagging a stat card as statistically unreliable with very few trades. */
function LowSampleTag() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-gold-soft px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-gold">
      low sample
    </span>
  );
}

/** Up/down arrow + delta comparing the current period to the immediately preceding one. */
function TrendBadge({ delta, label }: { delta: number; label: string }) {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold ${up ? "text-win" : "text-loss"}`}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {label}
    </span>
  );
}

function TriangleAlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function formatDrawdownDate(iso: string): string {
  if (!iso) return "from your starting balance";
  return `starting ${new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

interface Props {
  trades: SerializedTrade[];
  startingBalance: number;
}

export default function DashboardClient({ trades, startingBalance }: Props) {
  const searchParams = useSearchParams();
  const activeRange = parseRangeParam(searchParams.get("range"));
  const activePair = searchParams.get("pair") ?? DEFAULT_PAIR;
  const activeSetup = searchParams.get("setup") ?? DEFAULT_SETUP;

  const allPairs = useMemo(() => getDistinctPairs(trades), [trades]);
  const allSetups = useMemo(() => getDistinctSetups(trades), [trades]);

  const filteredTrades = useMemo(
    () => filterTrades(trades, { range: activeRange, pair: activePair, setup: activeSetup }),
    [trades, activeRange, activePair, activeSetup]
  );

  const stats = computeTradeStats(filteredTrades);
  const pairData = groupByPair(filteredTrades);
  const setupData = groupBySetup(filteredTrades);
  const sessionData = groupBySession(filteredTrades);
  const equityPoints = buildEquityCurve(filteredTrades, startingBalance);
  const drawdown = computeMaxDrawdown(equityPoints, startingBalance);
  const insights = generateInsights(filteredTrades);
  const streak = calculateStreak(filteredTrades);
  const trend = buildRecentTrendSeries(filteredTrades, 7);

  // Period-over-period comparison, only meaningful for fixed-length ranges (7d/30d/90d)
  // with enough trades on both sides — "ytd"/"all" have no equal-length prior window.
  const previousPeriodTrades = useMemo(
    () => filterPreviousPeriodTrades(trades, { range: activeRange, pair: activePair, setup: activeSetup }),
    [trades, activeRange, activePair, activeSetup]
  );
  const previousStats = computeTradeStats(previousPeriodTrades);
  const canShowTrend = previousPeriodTrades.length >= MIN_TREND_TRADES && filteredTrades.length >= MIN_TREND_TRADES;
  const balancePnlDelta = canShowTrend ? round2(stats.totalPnl - previousStats.totalPnl) : 0;
  const winRateDelta = canShowTrend ? round2(stats.winRate - previousStats.winRate) : 0;

  const extraInsights: Insight[] = [
    {
      emoji: "🎭",
      title: "Track your trade psychology",
      description:
        "Once you start tagging trades (e.g. 'FOMO entry', 'Textbook', 'Revenge trade') in a future update, this card will show you which behavioral patterns actually correlate with wins and losses.",
      action: "COMING SOON",
    },
  ];

  if (drawdown.hasDrawdown) {
    if (drawdown.recovered && drawdown.recoveryDays != null) {
      extraInsights.push({
        emoji: "📉",
        title: `Recovered from your ${drawdown.maxDrawdownPct.toFixed(1)}% drawdown fast`,
        description: `Your account fell ${drawdown.maxDrawdownPct.toFixed(1)}% ${formatDrawdownDate(
          drawdown.peakDate
        )}, then climbed back to a new equity high in ${drawdown.recoveryDays} day${
          drawdown.recoveryDays === 1 ? "" : "s"
        }.`,
        action: "HEALTHY RECOVERY",
      });
    } else if (!drawdown.recovered) {
      extraInsights.push({
        emoji: "⚠️",
        title: "Currently in a drawdown",
        description: `Your account is ${drawdown.maxDrawdownPct.toFixed(1)}% below its peak and counting — ${
          drawdown.ongoingDays
        } day${drawdown.ongoingDays === 1 ? "" : "s"} and still no new high.`,
        action: "MONITOR",
      });
    }
  }

  const allInsights = [...insights, ...extraInsights];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Live performance across all logged trades.</p>
        </div>
        {streak.count > 1 && streak.result && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              streak.result === "Win" ? "bg-win-soft text-win" : "bg-loss-soft text-loss"
            }`}
          >
            {streak.result === "Win" ? "🔥" : "⚠️"} {streak.count}-trade {streak.result === "Win" ? "win" : "loss"}{" "}
            streak
          </span>
        )}
      </div>

      <DashboardFilters
        activeRange={activeRange}
        activePair={activePair}
        activeSetup={activeSetup}
        pairs={allPairs}
        setups={allSetups}
      />

      {filteredTrades.length < SMALL_SAMPLE_THRESHOLD && (
        <div
          className="animate-fade-up flex items-center gap-2 rounded-lg border border-gold/20 bg-gold-soft px-3 py-2 text-xs text-gold"
          style={{ animationDelay: "20ms" }}
        >
          <TriangleAlertIcon />
          <span>
            Small sample — only {filteredTrades.length} trade{filteredTrades.length === 1 ? "" : "s"} logged. Win
            rate and averages will swing sharply until you have more data.
          </span>
        </div>
      )}

      <div
        className="grid animate-fade-up grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        style={{ animationDelay: "40ms" }}
      >
        <KpiCard
          label="Current Balance"
          value={formatCurrency(startingBalance + stats.totalPnl)}
          valueClassName="text-gold"
          sub={
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Starting: {formatCurrency(startingBalance)}</span>
              {canShowTrend && (
                <TrendBadge delta={balancePnlDelta} label={`${formatMoney(balancePnlDelta)} vs prior period`} />
              )}
            </div>
          }
        />
        <KpiCard
          label="Total P&L"
          value={formatMoney(stats.totalPnl)}
          valueClassName={stats.totalPnl >= 0 ? "text-win" : "text-loss"}
          sparkline={trend.pnl.length >= 2 ? <Sparkline values={trend.pnl} /> : undefined}
        />
        <KpiCard
          label={
            <>
              Win rate
              {filteredTrades.length < LOW_SAMPLE_CARD_THRESHOLD && <LowSampleTag />}
            </>
          }
          value={formatPercent(stats.winRate)}
          sub={
            canShowTrend ? (
              <TrendBadge delta={winRateDelta} label={`${winRateDelta > 0 ? "+" : ""}${winRateDelta.toFixed(1)}pp vs prior period`} />
            ) : undefined
          }
          sparkline={trend.winRate.length >= 2 ? <Sparkline values={trend.winRate} /> : undefined}
        />
        <KpiCard
          label={
            <>
              Profit factor
              {filteredTrades.length < LOW_SAMPLE_CARD_THRESHOLD && <LowSampleTag />}
            </>
          }
          value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "N/A"}
          valueClassName="text-gold"
          sub={
            stats.profitFactor == null ? (
              <span
                className="cursor-help text-xs text-slate-500"
                title="Profit factor (gross profit ÷ gross loss) is undefined until you have at least one winning trade."
              >
                Needs a winning trade ⓘ
              </span>
            ) : undefined
          }
        />
        <KpiCard
          label="Avg R (expectancy)"
          value={stats.avgRMultiple != null ? formatR(stats.avgRMultiple) : "—"}
          sub={
            stats.expectancy != null ? (
              <span className="text-xs text-slate-500">{formatMoney(stats.expectancy)} / trade</span>
            ) : undefined
          }
          sparkline={trend.avgR.length >= 2 ? <Sparkline values={trend.avgR} /> : undefined}
        />
        {(() => {
          const hasWins = stats.wins > 0;
          const hasLosses = stats.losses > 0;
          const label = (
            <>
              Avg win vs loss
              {filteredTrades.length < LOW_SAMPLE_CARD_THRESHOLD && <LowSampleTag />}
            </>
          );
          if (!hasWins && !hasLosses) {
            return <KpiCard label={label} value="—" />;
          }
          if (hasWins && hasLosses) {
            return (
              <KpiCard
                label={label}
                value={formatMoney(stats.avgWin)}
                valueClassName="text-win"
                sub={<span className="font-mono text-sm font-bold text-loss">{formatMoney(-stats.avgLoss)}</span>}
              />
            );
          }
          if (hasLosses) {
            return (
              <KpiCard
                label={label}
                value={formatMoney(-stats.avgLoss)}
                valueClassName="text-loss"
                sub={<span className="text-xs text-slate-500">No wins yet</span>}
              />
            );
          }
          return (
            <KpiCard
              label={label}
              value={formatMoney(stats.avgWin)}
              valueClassName="text-win"
              sub={<span className="text-xs text-slate-500">No losses yet</span>}
            />
          );
        })()}
      </div>

      <div className="animate-fade-up flex flex-col gap-4 lg:flex-row" style={{ animationDelay: "80ms" }}>
        <div className="lg:w-3/4">
          <EquityCurve points={equityPoints} startingBalance={startingBalance} drawdown={drawdown} />
        </div>
        <div className="lg:w-1/4">
          <MaxDrawdownCard drawdown={drawdown} />
        </div>
      </div>

      <div className="animate-fade-up flex flex-col gap-4 lg:flex-row" style={{ animationDelay: "100ms" }}>
        <div className="lg:w-[60%]">
          <CalendarHeatmap trades={filteredTrades} />
        </div>
        <div className="lg:w-[40%]">
          <WinLossDonut
            wins={stats.wins}
            losses={stats.losses}
            winRate={stats.winRate}
            avgWin={stats.avgWin}
            avgLoss={stats.avgLoss}
            largestWin={stats.largestWin}
            largestLoss={stats.largestLoss}
          />
        </div>
      </div>

      <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: "120ms" }}>
        <KpiCard
          label="Current streak"
          value={streak.count > 0 && streak.result ? `${streak.count}-trade ${streak.result === "Win" ? "win" : "loss"}` : "—"}
          valueClassName={streak.result === "Win" ? "text-win" : streak.result === "Loss" ? "text-loss" : undefined}
          sub={
            <span className="text-xs text-slate-500">
              {streak.count > 0 ? "Consecutive results" : "No active streak"}
            </span>
          }
        />
        <KpiCard
          label={
            <>
              Top setup
              {setupData[0] && (
                <span className="normal-case text-slate-600"> · {setupData[0].count} trade{setupData[0].count === 1 ? "" : "s"}</span>
              )}
            </>
          }
          value={setupData[0] ? setupData[0].setup : "—"}
          valueClassName={setupData[0] && setupData[0].totalPnl >= 0 ? "text-win" : "text-loss"}
          sub={
            <span className="text-xs text-slate-500">
              {setupData[0] ? formatMoney(setupData[0].totalPnl) : "No trades"}
            </span>
          }
        />
        <KpiCard
          label={
            <>
              Top session
              {sessionData[0] && (
                <span className="normal-case text-slate-600"> · {sessionData[0].count} trade{sessionData[0].count === 1 ? "" : "s"}</span>
              )}
            </>
          }
          value={sessionData[0] ? sessionData[0].session : "—"}
          valueClassName={sessionData[0] && sessionData[0].totalPnl >= 0 ? "text-win" : "text-loss"}
          sub={
            <span className="text-xs text-slate-500">
              {sessionData[0] ? formatMoney(sessionData[0].totalPnl) : "No trades"}
            </span>
          }
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "140ms" }}>
        <PairPerformanceBars data={pairData} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <SetupPerformanceGrid data={setupData} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <SessionBreakdown data={sessionData} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "280ms" }}>
        <InsightsGrid insights={allInsights} />
      </div>
    </div>
  );
}
