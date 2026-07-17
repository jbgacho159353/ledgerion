import type { SerializedTrade } from "@/lib/serialize";
import { round2 } from "@/lib/calculations";

export interface TradeStats {
  count: number;
  totalPnl: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number | null;
  avgRMultiple: number | null;
  expectancy: number | null;
  bestTrade: SerializedTrade | null;
  worstTrade: SerializedTrade | null;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

export const EMPTY_STATS: TradeStats = {
  count: 0,
  totalPnl: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  profitFactor: null,
  avgRMultiple: null,
  expectancy: null,
  bestTrade: null,
  worstTrade: null,
  avgWin: 0,
  avgLoss: 0,
  largestWin: 0,
  largestLoss: 0,
};

export function computeTradeStats(trades: SerializedTrade[]): TradeStats {
  if (trades.length === 0) return EMPTY_STATS;

  let totalPnl = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let rSum = 0;
  let rCount = 0;
  let bestTrade = trades[0];
  let worstTrade = trades[0];

  for (const t of trades) {
    const pnl = t.pnl;
    totalPnl += pnl;

    if (t.result === "Win") {
      wins += 1;
      grossWin += pnl;
    } else {
      losses += 1;
      grossLoss += Math.abs(pnl);
    }

    if (t.rMultiple != null) {
      rSum += t.rMultiple;
      rCount += 1;
    }

    if (pnl > bestTrade.pnl) bestTrade = t;
    if (pnl < worstTrade.pnl) worstTrade = t;
  }

  const winRate = round2((wins / trades.length) * 100);
  // Undefined (not 0) until there's at least one winning trade — gross profit of $0
  // isn't "no edge," it's "no data yet," so it shouldn't render as a real ratio.
  const profitFactor = wins > 0 && grossLoss > 0 ? round2(grossWin / grossLoss) : null;
  const avgRMultiple = rCount > 0 ? round2(rSum / rCount) : null;
  const avgWin = wins > 0 ? round2(grossWin / wins) : 0;
  const avgLoss = losses > 0 ? round2(grossLoss / losses) : 0;
  const winProb = wins / trades.length;
  const lossProb = losses / trades.length;
  const expectancy = round2(winProb * avgWin - lossProb * avgLoss);

  const winPnls = trades.filter((t) => t.result === "Win").map((t) => t.pnl);
  const lossPnls = trades.filter((t) => t.result === "Loss").map((t) => t.pnl);

  return {
    count: trades.length,
    totalPnl: round2(totalPnl),
    wins,
    losses,
    winRate,
    profitFactor,
    avgRMultiple,
    expectancy,
    bestTrade,
    worstTrade,
    avgWin,
    avgLoss,
    largestWin: winPnls.length > 0 ? round2(Math.max(...winPnls)) : 0,
    largestLoss: lossPnls.length > 0 ? round2(Math.min(...lossPnls)) : 0,
  };
}

export interface PairPerformance {
  pair: string;
  totalPnl: number;
  count: number;
}

export function groupByPair(trades: SerializedTrade[]): PairPerformance[] {
  const map = new Map<string, { totalPnl: number; count: number }>();
  for (const t of trades) {
    const existing = map.get(t.pair) ?? { totalPnl: 0, count: 0 };
    existing.totalPnl += t.pnl;
    existing.count += 1;
    map.set(t.pair, existing);
  }
  return Array.from(map.entries())
    .map(([pair, v]) => ({ pair, totalPnl: round2(v.totalPnl), count: v.count }))
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export interface SetupPerformance {
  setup: string;
  totalPnl: number;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function groupBySetup(trades: SerializedTrade[]): SetupPerformance[] {
  const map = new Map<string, { totalPnl: number; count: number; wins: number; losses: number }>();
  for (const t of trades) {
    const key = t.setup?.trim() || "Unlabeled";
    const existing = map.get(key) ?? { totalPnl: 0, count: 0, wins: 0, losses: 0 };
    existing.totalPnl += t.pnl;
    existing.count += 1;
    if (t.result === "Win") existing.wins += 1;
    else existing.losses += 1;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([setup, v]) => ({
      setup,
      totalPnl: round2(v.totalPnl),
      count: v.count,
      wins: v.wins,
      losses: v.losses,
      winRate: round2((v.wins / v.count) * 100),
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export interface SessionPerformance {
  session: string;
  totalPnl: number;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function groupBySession(trades: SerializedTrade[]): SessionPerformance[] {
  const map = new Map<string, { totalPnl: number; count: number; wins: number; losses: number }>();
  for (const t of trades) {
    const key = t.session;
    const existing = map.get(key) ?? { totalPnl: 0, count: 0, wins: 0, losses: 0 };
    existing.totalPnl += t.pnl;
    existing.count += 1;
    if (t.result === "Win") existing.wins += 1;
    else existing.losses += 1;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([session, v]) => ({
      session,
      totalPnl: round2(v.totalPnl),
      count: v.count,
      wins: v.wins,
      losses: v.losses,
      winRate: round2((v.wins / v.count) * 100),
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export interface Streak {
  result: "Win" | "Loss" | null;
  count: number;
}

/** Consecutive same-result streak ending at the most recent trade (by date, then createdAt). */
export function calculateStreak(trades: SerializedTrade[]): Streak {
  if (trades.length === 0) return { result: null, count: 0 };
  const sorted = [...trades].sort(
    (a, b) => b.tradeDate.localeCompare(a.tradeDate) || b.createdAt.localeCompare(a.createdAt)
  );
  const mostRecent = sorted[0].result as "Win" | "Loss";
  let count = 0;
  for (const t of sorted) {
    if (t.result !== mostRecent) break;
    count += 1;
  }
  return { result: mostRecent, count };
}

export interface RecentTrendSeries {
  pnl: number[];
  winRate: number[];
  avgR: number[];
}

/**
 * Builds sparkline-friendly trend series from the most recent N trades
 * (oldest to newest): a running cumulative P&L, a running win rate %, and
 * a running average R multiple, each computed only within that window.
 */
export function buildRecentTrendSeries(trades: SerializedTrade[], n: number): RecentTrendSeries {
  const sorted = [...trades].sort(
    (a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.createdAt.localeCompare(b.createdAt)
  );
  const recent = sorted.slice(-n);

  const pnl: number[] = [];
  const winRate: number[] = [];
  const avgR: number[] = [];

  let cumPnl = 0;
  let wins = 0;
  let rSum = 0;
  let rCount = 0;

  recent.forEach((t, i) => {
    cumPnl += t.pnl;
    pnl.push(round2(cumPnl));

    if (t.result === "Win") wins += 1;
    winRate.push(round2((wins / (i + 1)) * 100));

    if (t.rMultiple != null) {
      rSum += t.rMultiple;
      rCount += 1;
    }
    avgR.push(rCount > 0 ? round2(rSum / rCount) : 0);
  });

  return { pnl, winRate, avgR };
}

export interface EquityPoint {
  date: string;
  balance: number;
  pnl: number;
  result: string;
  tradeId: string;
}

export function buildEquityCurve(trades: SerializedTrade[], startingBalance: number): EquityPoint[] {
  const sorted = [...trades].sort(
    (a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.createdAt.localeCompare(b.createdAt)
  );
  let balance = startingBalance;
  return sorted.map((t) => {
    balance = round2(balance + t.pnl);
    return {
      date: t.tradeDate,
      balance,
      pnl: t.pnl,
      result: t.result,
      tradeId: t.id,
    };
  });
}

export interface DrawdownStats {
  /** False when equity has only ever gone up (no point below its running peak). */
  hasDrawdown: boolean;
  /** Clamped to [0, 100] — a percent-of-peak drawdown is meaningless past -100%. See accountDepleted. */
  maxDrawdownPct: number;
  /** True when the trough balance fell to zero or below, meaning the raw (peak-trough)/peak
   *  ratio actually exceeded 100% before clamping — the account balance itself (see
   *  troughBalance) still reflects the real, unclamped, possibly-negative number. */
  accountDepleted: boolean;
  maxDrawdownAmount: number;
  peakBalance: number;
  peakDate: string;
  /** Index into the same [starting-balance, ...equityPoints] series EquityCurve renders. */
  peakIndex: number;
  troughBalance: number;
  troughDate: string;
  troughIndex: number;
  /** Whether equity made a new all-time high (above peakBalance) after the trough. */
  recovered: boolean;
  recoveryDate: string | null;
  recoveryDays: number | null;
  /** Days since the drawdown began (the peak date), only set while still unrecovered. */
  ongoingDays: number | null;
  /** True when the most recent equity point is at (or above) the all-time high. */
  isCurrentlyAtHigh: boolean;
}

function daysBetween(fromIso: string, toIso: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / MS_PER_DAY);
}

/** Computes the deepest peak-to-trough drawdown from an equity series already built by buildEquityCurve. */
export function computeMaxDrawdown(equityPoints: EquityPoint[], startingBalance: number): DrawdownStats {
  const series = [
    { date: equityPoints[0]?.date ?? "", balance: startingBalance },
    ...equityPoints.map((p) => ({ date: p.date, balance: p.balance })),
  ];

  let runningPeak = series[0].balance;
  let runningPeakDate = series[0].date;
  let runningPeakIndex = 0;

  let maxDDPct = 0;
  let maxDDAmount = 0;
  let ddPeakBalance = series[0].balance;
  let ddPeakDate = series[0].date;
  let ddPeakIndex = 0;
  let ddTroughBalance = series[0].balance;
  let ddTroughDate = series[0].date;
  let ddTroughIndex = 0;

  for (let i = 1; i < series.length; i++) {
    const point = series[i];
    if (point.balance > runningPeak) {
      runningPeak = point.balance;
      runningPeakDate = point.date;
      runningPeakIndex = i;
    }
    const ddPct = runningPeak > 0 ? ((runningPeak - point.balance) / runningPeak) * 100 : 0;
    if (ddPct > maxDDPct) {
      maxDDPct = ddPct;
      maxDDAmount = round2(runningPeak - point.balance);
      ddPeakBalance = runningPeak;
      ddPeakDate = runningPeakDate;
      ddPeakIndex = runningPeakIndex;
      ddTroughBalance = point.balance;
      ddTroughDate = point.date;
      ddTroughIndex = i;
    }
  }

  const allTimeHigh = Math.max(...series.map((p) => p.balance));
  const currentBalance = series[series.length - 1].balance;
  const isCurrentlyAtHigh = currentBalance >= allTimeHigh;

  if (maxDDPct <= 0) {
    return {
      hasDrawdown: false,
      maxDrawdownPct: 0,
      accountDepleted: false,
      maxDrawdownAmount: 0,
      peakBalance: runningPeak,
      peakDate: runningPeakDate,
      peakIndex: runningPeakIndex,
      troughBalance: runningPeak,
      troughDate: runningPeakDate,
      troughIndex: runningPeakIndex,
      recovered: true,
      recoveryDate: null,
      recoveryDays: null,
      ongoingDays: null,
      isCurrentlyAtHigh: true,
    };
  }

  let recovered = false;
  let recoveryDate: string | null = null;
  let recoveryDays: number | null = null;
  let ongoingDays: number | null = null;

  for (let i = ddTroughIndex + 1; i < series.length; i++) {
    if (series[i].balance > ddPeakBalance) {
      recovered = true;
      recoveryDate = series[i].date;
      recoveryDays = daysBetween(ddTroughDate, recoveryDate);
      break;
    }
  }

  if (!recovered) {
    const today = new Date().toISOString().slice(0, 10);
    ongoingDays = Math.max(0, daysBetween(ddPeakDate, today));
  }

  return {
    hasDrawdown: true,
    // A percent-of-peak drawdown is only meaningful in [0, 100] — once the balance itself
    // goes to zero or below, (peak-trough)/peak mathematically exceeds 100%, which reads as
    // a nonsensical "-197.7%" rather than the "account wiped out" it actually represents.
    maxDrawdownPct: round2(Math.min(maxDDPct, 100)),
    accountDepleted: ddTroughBalance <= 0,
    maxDrawdownAmount: maxDDAmount,
    peakBalance: ddPeakBalance,
    peakDate: ddPeakDate,
    peakIndex: ddPeakIndex,
    troughBalance: ddTroughBalance,
    troughDate: ddTroughDate,
    troughIndex: ddTroughIndex,
    recovered,
    recoveryDate,
    recoveryDays,
    ongoingDays,
    isCurrentlyAtHigh,
  };
}
