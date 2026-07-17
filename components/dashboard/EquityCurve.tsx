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
          const areaPath = `M ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} L ${c.x.toFixed(1)} ${c.y.toFixed(1)} L ${c.x.toFixed(1)} ${HEIGHT - PAD_Y} L ${prev.x.toFixed(1)} ${HEIGHT - PAD_Y} Z`;
          const linePath = `M ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
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
