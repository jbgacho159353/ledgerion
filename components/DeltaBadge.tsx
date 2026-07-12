interface Props {
  current: number;
  previous: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
  suffix?: string;
}

export default function DeltaBadge({
  current,
  previous,
  format = (v) => v.toFixed(2),
  higherIsBetter = true,
  suffix = " vs prior period",
}: Props) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-slate-500">No prior data</span>;
  }

  const diff = current - previous;
  const isFlat = Math.abs(diff) < 0.005;
  const isUp = diff > 0;
  const isGood = isFlat ? null : higherIsBetter ? isUp : !isUp;
  const color = isFlat ? "text-slate-400" : isGood ? "text-win" : "text-loss";
  const arrow = isFlat ? "→" : isUp ? "▲" : "▼";

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${color}`}>
      {arrow} {format(Math.abs(diff))}
      <span className="text-slate-500">{suffix}</span>
    </span>
  );
}
