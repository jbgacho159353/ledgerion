import type { PairPerformance } from "@/lib/stats";

export default function PairPerformanceBars({ data }: { data: PairPerformance[] }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.totalPnl)), 1);

  return (
    <div className="glass-card p-[20px]">
      <h3 className="mb-4 font-sans text-sm font-semibold text-slate-300">P&amp;L by pair</h3>
      <div className="space-y-2.5">
        {data.map((d) => {
          const widthPct = (Math.abs(d.totalPnl) / maxAbs) * 100;
          const isWin = d.totalPnl >= 0;
          return (
            <div key={d.pair} className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-mono text-xs text-slate-400">{d.pair}</span>
              <div className="h-3 max-w-[70%] flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className={`h-full rounded-full ${isWin ? "bg-win" : "bg-loss"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className={`w-20 shrink-0 text-right font-mono text-xs ${isWin ? "text-win" : "text-loss"}`}>
                {isWin ? "+" : ""}
                ${d.totalPnl.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
