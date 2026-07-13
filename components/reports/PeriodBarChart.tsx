import { formatCompactCurrency } from "@/lib/format";

interface Bar {
  label: string;
  value: number;
  percentage?: number | null;
  dateLabel?: string;
}

interface Props {
  title: string;
  bars: Bar[];
  subtitle?: React.ReactNode;
}

/** P&L-per-bucket bar chart (day or month), color-coded win/loss, with subtle gridlines and a fade-up entrance. */
export default function PeriodBarChart({ title, bars, subtitle }: Props) {
  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  const hasPercentageLabels = bars.some((b) => b.percentage != null);
  // Leave headroom above the tallest bar so its % label never crowds the top gridline.
  const maxBarHeightPct = hasPercentageLabels ? 82 : 100;
  // 4 evenly spaced ticks from the top gridline (maxAbs) down to the baseline (0).
  const axisTicks = [0, 1, 2, 3].map((i) => maxAbs - (maxAbs * i) / 3);

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-sans text-sm font-semibold text-slate-300">{title}</h3>
        {subtitle}
      </div>
      <div className="flex gap-2">
        <div className="flex h-48 shrink-0 flex-col justify-between text-right font-mono text-[10px] text-slate-500">
          {axisTicks.map((v, i) => (
            <span key={i}>{formatCompactCurrency(v).replace(/^\+/, "")}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative flex h-48 min-w-max items-end gap-1 sm:min-w-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col justify-between">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-t border-border/40" />
              ))}
            </div>
            {bars.map((b, i) => {
              const heightPct = Math.max((Math.abs(b.value) / maxAbs) * maxBarHeightPct, b.value !== 0 ? 2 : 0);
              const isWin = b.value >= 0;
              return (
                <div
                  key={`${b.label}-${i}`}
                  className="relative flex h-full w-6 flex-1 flex-col items-center justify-end sm:w-auto"
                >
                  {b.percentage != null && (
                    <span
                      className={`mb-1 whitespace-nowrap text-[10px] font-medium ${isWin ? "text-win" : "text-loss"}`}
                    >
                      {isWin ? "+" : ""}
                      {b.percentage.toFixed(1)}%
                    </span>
                  )}
                  <div
                    className={`animate-fade-up w-full rounded-t ${isWin ? "bg-win" : "bg-loss"}`}
                    style={{ height: `${heightPct}%`, animationDelay: `${i * 15}ms` }}
                    title={`${b.dateLabel ?? b.label}: ${isWin ? "+" : ""}$${Math.abs(b.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex min-w-max gap-1 text-[10px] text-slate-500 sm:min-w-0">
            {bars.map((b, i) => (
              <span key={`${b.label}-${i}`} className="w-6 flex-1 truncate text-center sm:w-auto">
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
