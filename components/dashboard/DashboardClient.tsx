import type { SerializedTrade } from "@/lib/serialize";
import {
  computeTradeStats,
  groupByPair,
  groupBySetup,
  groupBySession,
  buildEquityCurve,
  calculateStreak,
  buildRecentTrendSeries,
} from "@/lib/stats";
import { generateInsights } from "@/lib/insights";
import { formatMoney, formatPercent, formatR, formatCurrency } from "@/lib/format";
import KpiCard from "@/components/KpiCard";
import Sparkline from "@/components/Sparkline";
import EquityCurve from "./EquityCurve";
import CalendarHeatmap from "./CalendarHeatmap";
import WinLossDonut from "./WinLossDonut";
import PairPerformanceBars from "./PairPerformanceBars";
import SetupPerformanceGrid from "./SetupPerformanceGrid";
import SessionBreakdown from "./SessionBreakdown";
import InsightsGrid from "./InsightsGrid";

interface Props {
  trades: SerializedTrade[];
  startingBalance: number;
}

export default function DashboardClient({ trades, startingBalance }: Props) {
  const stats = computeTradeStats(trades);
  const pairData = groupByPair(trades);
  const setupData = groupBySetup(trades);
  const sessionData = groupBySession(trades);
  const equityPoints = buildEquityCurve(trades, startingBalance);
  const insights = generateInsights(trades);
  const streak = calculateStreak(trades);
  const trend = buildRecentTrendSeries(trades, 7);

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

      <div
        className="grid animate-fade-up grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        style={{ animationDelay: "40ms" }}
      >
        <KpiCard
          label="Current Balance"
          value={formatCurrency(startingBalance + stats.totalPnl)}
          valueClassName="text-gold"
          sub={<span className="text-xs text-slate-500">Starting: {formatCurrency(startingBalance)}</span>}
        />
        <KpiCard
          label="Total P&L"
          value={formatMoney(stats.totalPnl)}
          valueClassName={stats.totalPnl >= 0 ? "text-win" : "text-loss"}
          sparkline={trend.pnl.length >= 2 ? <Sparkline values={trend.pnl} /> : undefined}
        />
        <KpiCard
          label="Win rate"
          value={formatPercent(stats.winRate)}
          sparkline={trend.winRate.length >= 2 ? <Sparkline values={trend.winRate} /> : undefined}
        />
        <KpiCard
          label="Profit factor"
          value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "—"}
          valueClassName="text-gold"
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
        <KpiCard
          label="Avg win vs loss"
          value={formatMoney(stats.avgWin)}
          valueClassName="text-win"
          sub={
            <span className="font-mono text-sm font-bold text-loss">{formatMoney(-stats.avgLoss)}</span>
          }
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <EquityCurve points={equityPoints} startingBalance={startingBalance} />
      </div>

      <div className="animate-fade-up flex flex-col gap-4 lg:flex-row" style={{ animationDelay: "100ms" }}>
        <div className="lg:w-3/4">
          <CalendarHeatmap trades={trades} />
        </div>
        <div className="lg:w-1/4">
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
          label="Win / Loss"
          value={formatPercent(stats.winRate)}
          sub={
            <span className="text-xs text-slate-500">
              {stats.wins}W - {stats.losses}L
            </span>
          }
        />
        <KpiCard
          label="Top setup"
          value={setupData[0] ? setupData[0].setup : "—"}
          valueClassName={setupData[0] && setupData[0].totalPnl >= 0 ? "text-win" : "text-loss"}
          sub={
            <span className="text-xs text-slate-500">
              {setupData[0] ? formatMoney(setupData[0].totalPnl) : "No trades"}
            </span>
          }
        />
        <KpiCard
          label="Top session"
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
        <InsightsGrid insights={insights} />
      </div>
    </div>
  );
}
