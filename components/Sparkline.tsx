interface Props {
  values: number[];
  width?: number;
  height?: number;
}

/** Tiny inline trend line — no axes/labels, colored green/red by first-vs-last direction. */
export default function Sparkline({ values, width = 70, height = 22 }: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const denom = values.length - 1;

  const points = values
    .map((v, i) => {
      const x = (i / denom) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const trendUp = values[values.length - 1] >= values[0];
  const color = trendUp ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
