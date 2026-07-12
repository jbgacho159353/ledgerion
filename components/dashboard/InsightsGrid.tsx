import type { Insight } from "@/lib/insights";

const ACTION_STYLES: Record<Insight["action"], string> = {
  CUT: "bg-loss-soft text-loss",
  "DOUBLE DOWN": "bg-win-soft text-win",
  REWORK: "bg-gold-soft text-gold",
  MAINTAIN: "bg-neutral-soft text-neutral",
  "COMING SOON": "bg-white/5 text-slate-400",
  "HEALTHY RECOVERY": "bg-win-soft text-win",
  MONITOR: "bg-gold-soft text-gold",
};

export default function InsightsGrid({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 font-sans text-sm font-semibold text-slate-300">Actionable insights</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {insights.map((insight, i) => (
          <div key={i} className="rounded-xl border border-border bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xl">{insight.emoji}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTION_STYLES[insight.action]}`}
              >
                {insight.action}
              </span>
            </div>
            <p className="font-sans text-sm font-medium text-white">{insight.title}</p>
            <p className="mt-1 text-xs text-slate-400">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
