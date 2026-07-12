import type { EquityPoint } from "@/lib/stats";

interface Props {
  points: EquityPoint[];
  startingBalance: number;
}

const WIDTH = 800;
const HEIGHT = 260;
const PAD_X = 10;
const PAD_Y = 24;

export default function EquityCurve({ points, startingBalance }: Props) {
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

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${HEIGHT - PAD_Y} L ${first.x.toFixed(1)} ${HEIGHT - PAD_Y} Z`;

  const finalBalance = series[series.length - 1].balance;
  const isUp = finalBalance >= startingBalance;
  const strokeColor = isUp ? "#22c55e" : "#ef4444";

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
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#equity-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2} />
        {coords.slice(1).map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={3}
            fill={c.result === "Win" ? "#22c55e" : "#ef4444"}
            stroke="#0a0e1a"
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}
