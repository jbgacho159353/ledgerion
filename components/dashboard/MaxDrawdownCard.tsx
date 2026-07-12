import type { DrawdownStats } from "@/lib/stats";
import { formatCurrency } from "@/lib/format";

interface Props {
  drawdown: DrawdownStats;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MaxDrawdownCard({ drawdown }: Props) {
  if (!drawdown.hasDrawdown) {
    return (
      <div className="glass-card flex h-full flex-col p-5">
        <h3 className="font-sans text-sm font-semibold text-slate-300">Max Drawdown</h3>
        <div className="mt-3 font-mono text-3xl font-bold text-slate-200">0.0%</div>
        <p className="mt-2 text-xs text-slate-500">No drawdown yet — equity has only increased.</p>
      </div>
    );
  }

  const barWidthPct = Math.min(100, (drawdown.maxDrawdownPct / 20) * 100);
  const startedLabel = drawdown.peakIndex === 0 ? "Account start" : formatDate(drawdown.peakDate);

  return (
    <div className="glass-card flex h-full flex-col p-5">
      <h3 className="font-sans text-sm font-semibold text-slate-300">Max Drawdown</h3>

      <div className="mt-3 font-mono text-3xl font-bold text-loss">-{drawdown.maxDrawdownPct.toFixed(1)}%</div>
      <p className="mt-1 text-xs text-slate-500">-{formatCurrency(drawdown.maxDrawdownAmount)} from peak</p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidthPct}%`,
            background: "linear-gradient(90deg, #ef4444, #f97316)",
          }}
        />
      </div>

      <div className="my-4 border-t border-border" />

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Peak balance</span>
          <span className="font-mono text-slate-300">{formatCurrency(drawdown.peakBalance)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Trough balance</span>
          <span className="font-mono text-slate-300">{formatCurrency(drawdown.troughBalance)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Started</span>
          <span className="font-mono text-slate-300">{startedLabel}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        {drawdown.isCurrentlyAtHigh ? (
          <p className="text-xs text-slate-500">Currently at new equity highs — no active drawdown.</p>
        ) : drawdown.recovered ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Recovery time</span>
            <span className="font-mono font-semibold text-win">{drawdown.recoveryDays} days</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Recovery time</span>
            <span className="font-mono font-semibold text-gold">Ongoing ({drawdown.ongoingDays}d)</span>
          </div>
        )}
      </div>
    </div>
  );
}
