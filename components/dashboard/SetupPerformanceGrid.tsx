import type { SetupPerformance } from "@/lib/stats";

export default function SetupPerformanceGrid({ data }: { data: SetupPerformance[] }) {
  return (
    <div className="glass-card h-full p-[20px]">
      <h3 className="mb-4 font-sans text-sm font-semibold text-slate-300">Setup performance</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((s) => (
          <div key={s.setup} className="rounded-xl border border-border bg-white/[0.02] p-[20px]">
            <p className="truncate text-xs text-slate-400" title={s.setup}>
              {s.setup}
            </p>
            <p
              className={`mt-1 truncate font-mono text-base font-semibold ${
                s.totalPnl >= 0 ? "text-win" : "text-loss"
              }`}
              title={`${s.totalPnl >= 0 ? "+" : ""}$${s.totalPnl.toFixed(0)}`}
            >
              {s.totalPnl >= 0 ? "+" : ""}
              ${s.totalPnl.toFixed(0)}
            </p>
            <p className="text-[11px] text-slate-500">
              {s.count} trades · {s.winRate.toFixed(0)}% win
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
