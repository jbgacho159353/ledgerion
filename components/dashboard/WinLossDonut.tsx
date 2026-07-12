interface Props {
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

export default function WinLossDonut({
  wins,
  losses,
  winRate,
  avgWin,
  avgLoss,
  largestWin,
  largestLoss,
}: Props) {
  const total = wins + losses;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const winLength = total > 0 ? (wins / total) * circumference : 0;

  return (
    <div className="glass-card flex h-full flex-col p-5">
      <h3 className="font-sans text-sm font-semibold text-slate-300">Win / Loss</h3>

      <div className="mt-4 flex flex-col items-center">
        <svg
          viewBox="0 0 200 200"
          className="h-auto w-full max-w-[190px] drop-shadow-[0_0_28px_rgba(34,197,94,0.18)]"
        >
          <defs>
            <linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
          <circle cx={100} cy={100} r={radius} fill="none" stroke="rgba(239,68,68,0.18)" strokeWidth={18} />
          <circle
            cx={100}
            cy={100}
            r={radius}
            fill="none"
            stroke="url(#winGradient)"
            strokeWidth={18}
            strokeDasharray={`${winLength} ${circumference - winLength}`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
          <text
            x={100}
            y={95}
            textAnchor="middle"
            fill="white"
            fontFamily="var(--font-jetbrains-mono)"
            fontSize={36}
            fontWeight={700}
          >
            {winRate.toFixed(0)}%
          </text>
          <text x={100} y={118} textAnchor="middle" fill="#94a3b8" fontSize={11} letterSpacing="0.08em">
            WIN RATE
          </text>
        </svg>

        <div className="mt-4 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-win" />
            {wins} win{wins === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-loss" />
            {losses} loss{losses === 1 ? "" : "es"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-win/20 bg-win-soft p-3">
          <p className="text-[10px] uppercase tracking-wide text-win/70">Avg win</p>
          <p className="mt-1 font-mono text-base font-semibold text-win">${avgWin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-loss/20 bg-loss-soft p-3">
          <p className="text-[10px] uppercase tracking-wide text-loss/70">Avg loss</p>
          <p className="mt-1 font-mono text-base font-semibold text-loss">${avgLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-win/20 bg-win-soft p-3">
          <p className="text-[10px] uppercase tracking-wide text-win/70">Largest win</p>
          <p className="mt-1 font-mono text-base font-semibold text-win">${largestWin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-loss/20 bg-loss-soft p-3">
          <p className="text-[10px] uppercase tracking-wide text-loss/70">Largest loss</p>
          <p className="mt-1 font-mono text-base font-semibold text-loss">${Math.abs(largestLoss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}
