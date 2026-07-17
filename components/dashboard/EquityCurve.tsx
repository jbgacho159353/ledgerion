import type { DrawdownStats, EquityPoint } from "@/lib/stats";

interface Props {
  points: EquityPoint[];
  startingBalance: number;
  drawdown?: DrawdownStats;
}

const WIDTH = 800;
const HEIGHT = 260;
const PAD_X = 10;
const PAD_Y = 24;
const UP_COLOR = "#22c55e";
const DOWN_COLOR = "#ef4444";

/**
 * Per-point tangent slopes for a monotone cubic (Fritsch-Carlson) Hermite spline
 * through (xs[i], ys[i]). Unlike a cardinal/Catmull-Rom spline, this can never
 * overshoot past the y-range of any single segment's two endpoints — the curve
 * only ever passes between the actual balance values it's drawn through, never
 * above or below them, so smoothing can't invent a fake dip or spike.
 */
function computeMonotoneTangents(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const m = new Array(n).fill(0);
  if (n < 2) return m;

  const delta: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const h = xs[k + 1] - xs[k] || 1;
    delta.push((ys[k + 1] - ys[k]) / h);
  }

  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let k = 1; k < n - 1; k++) {
    m[k] = (delta[k - 1] + delta[k]) / 2;
  }

  for (let k = 0; k < n - 1; k++) {
    const dk = delta[k];
    if (dk === 0) {
      m[k] = 0;
      m[k + 1] = 0;
      continue;
    }
    if (m[k] / dk < 0) m[k] = 0;
    if (m[k + 1] / dk < 0) m[k + 1] = 0;
    const a = m[k] / dk;
    const b = m[k + 1] / dk;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[k] = tau * m[k];
      m[k + 1] = tau * m[k + 1];
    }
  }

  return m;
}

export default function EquityCurve({ points, startingBalance, drawdown }: Props) {
  const series = [
    { balance: startingBalance, result: "start", pnl: 0, date: "", tradeId: "start" },
    ...points,
  ];
  const values = series.map((p) => p.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const denom = series.length - 1 || 1;

  const coords = series.map((p, i) => ({
    x: PAD_X + (i / denom) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_Y - ((p.balance - min) / range) * (HEIGHT - PAD_Y * 2),
    result: p.result,
  }));

  // One tangent per point, shared by the segment before and after it, so the
  // curve is continuous (no visible kink) even though each segment is drawn
  // as its own colored <path> below.
  const tangents = computeMonotoneTangents(
    coords.map((c) => c.x),
    coords.map((c) => c.y)
  );

  // Per-segment coloring: a segment is green when its endpoint reaches or
  // exceeds the running peak seen so far, red when it's below it — computed
  // fresh per point so the curve correctly handles multiple peaks/troughs.
  let runningPeak = values[0];
  const segmentColors = values.slice(1).map((v) => {
    const color = v >= runningPeak ? UP_COLOR : DOWN_COLOR;
    if (v > runningPeak) runningPeak = v;
    return color;
  });

  const finalBalance = series[series.length - 1].balance;
  const isUp = finalBalance >= startingBalance;

  const ddPeakCoord = drawdown?.hasDrawdown ? coords[drawdown.peakIndex] : null;
  const ddTroughCoord = drawdown?.hasDrawdown ? coords[drawdown.troughIndex] : null;

  return (
    <div className="glass-card h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-sans text-sm font-semibold text-slate-300">Equity curve</h3>
        <span className={`font-mono text-sm font-semibold ${isUp ? "text-win" : "text-loss"}`}>
          ${finalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 240 }}
      >
        <defs>
          <linearGradient id="equityAreaUp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={UP_COLOR} stopOpacity={0.4} />
            <stop offset="100%" stopColor={UP_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="equityAreaDown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DOWN_COLOR} stopOpacity={0.4} />
            <stop offset="100%" stopColor={DOWN_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        {coords.slice(1).map((c, i) => {
          const prev = coords[i];
          const color = segmentColors[i];
          const h = c.x - prev.x;
          const cp1x = prev.x + h / 3;
          const cp1y = prev.y + (tangents[i] * h) / 3;
          const cp2x = c.x - h / 3;
          const cp2y = c.y - (tangents[i + 1] * h) / 3;
          const curveCmd = `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
          const areaPath = `M ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${curveCmd} L ${c.x.toFixed(1)} ${HEIGHT - PAD_Y} L ${prev.x.toFixed(1)} ${HEIGHT - PAD_Y} Z`;
          const linePath = `M ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${curveCmd}`;
          const areaFill = color === UP_COLOR ? "url(#equityAreaUp)" : "url(#equityAreaDown)";
          return (
            <g key={i}>
              <path d={areaPath} fill={areaFill} stroke="none" />
              <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
        {ddPeakCoord && (
          <g>
            <circle
              cx={ddPeakCoord.x}
              cy={ddPeakCoord.y}
              r={10}
              fill="none"
              stroke="#eab308"
              strokeWidth={1.5}
              opacity={0.55}
              className="animate-ping"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
            <circle cx={ddPeakCoord.x} cy={ddPeakCoord.y} r={6} fill="#0a0e1a" stroke="#eab308" strokeWidth={2.5} />
          </g>
        )}
        {ddTroughCoord && (
          <g>
            <circle
              cx={ddTroughCoord.x}
              cy={ddTroughCoord.y}
              r={10}
              fill="none"
              stroke={DOWN_COLOR}
              strokeWidth={1.5}
              opacity={0.55}
              className="animate-ping"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
            <circle cx={ddTroughCoord.x} cy={ddTroughCoord.y} r={6} fill="#0a0e1a" stroke={DOWN_COLOR} strokeWidth={2.5} />
          </g>
        )}
        {coords.slice(1).map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={3}
            fill={c.result === "Win" ? UP_COLOR : DOWN_COLOR}
            stroke="#0a0e1a"
            strokeWidth={1}
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-win" />
          Winning trade
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-loss" />
          Losing trade
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-win/20" />
          Rising toward high
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-loss/20" />
          Below peak
        </span>
        {drawdown?.hasDrawdown && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: "#eab308" }} />
              Peak
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-loss" />
              Trough
            </span>
          </>
        )}
      </div>
    </div>
  );
}
