import type { SessionPerformance } from "@/lib/stats";

export default function SessionBreakdown({ data }: { data: SessionPerformance[] }) {
  return (
    <div className="glass-card p-[20px]">
      <h3 className="mb-4 font-sans text-sm font-semibold text-slate-300">Session breakdown</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <div key={s.session} className="rounded-xl border border-border bg-white/[0.02] p-[20px]">
            <p className="font-sans text-sm font-medium text-white">{s.session}</p>
            <p className={`mt-1 font-mono text-xl font-semibold ${s.totalPnl >= 0 ? "text-win" : "text-loss"}`}>
              {s.totalPnl >= 0 ? "+" : "-"}
              ${Math.abs(s.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 whitespace-nowrap text-[10px] text-slate-500">
              {s.wins}W-{s.losses}L · {s.winRate.toFixed(0)}% · {s.count} trade{s.count === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
