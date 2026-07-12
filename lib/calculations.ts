export type Direction = "Long" | "Short";
export type Result = "Win" | "Loss";

export interface TradeMetrics {
  pips: number;
  riskAmount: number;
  pnl: number;
  rMultiple: number | null;
}

/**
 * Single source of truth for pip/risk/P&L/R-multiple math. Instrument-aware:
 * - XAUUSD: pip size 0.1, $/unit = lotSize * 100 (1 standard lot = 100 oz).
 * - JPY-quoted pairs (USDJPY, GBPJPY, EURJPY, ...): pip size 0.01, $/unit
 *   approximated via the exit price as the USD conversion rate (a
 *   journaling approximation, not broker-exact).
 * - Standard USD-quote forex pairs (EURUSD, GBPUSD, AUDUSD, NZDUSD, ...):
 *   pip size 0.0001, $/unit = lotSize * 100000 (a standard 100k-unit lot).
 */
export function calculateTradeMetrics({
  pair,
  direction,
  entryPrice,
  stopLoss,
  exitPrice,
  lotSize,
}: {
  pair: string;
  direction: Direction;
  entryPrice: number;
  stopLoss: number;
  exitPrice: number;
  lotSize: number;
}): TradeMetrics {
  const upperPair = pair.toUpperCase();

  // Pip size: how many price units make up 1 "pip" for this instrument
  let pipSize: number;
  if (upperPair === "XAUUSD") {
    pipSize = 0.1;
  } else if (upperPair.includes("JPY")) {
    pipSize = 0.01;
  } else {
    pipSize = 0.0001;
  }

  // Dollar value per single price unit (NOT per pip) for the given lot size
  let dollarPerPriceUnit: number;
  if (upperPair === "XAUUSD") {
    // 1 standard lot of gold = 100 oz, so $ per $1 move = lotSize * 100
    dollarPerPriceUnit = lotSize * 100;
  } else if (upperPair.includes("JPY")) {
    // Approximation: use exit price as the conversion rate back to USD
    dollarPerPriceUnit = (lotSize * 100000) / exitPrice;
  } else {
    // Standard USD-quote forex pairs (EURUSD, GBPUSD, AUDUSD, NZDUSD)
    dollarPerPriceUnit = lotSize * 100000;
  }

  const priceDiffToExit = Math.abs(exitPrice - entryPrice);
  const priceDiffToStop = Math.abs(entryPrice - stopLoss);

  const pips = priceDiffToExit / pipSize;
  const riskAmount = priceDiffToStop * dollarPerPriceUnit;

  const directionalDiff = direction === "Long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pnl = directionalDiff * dollarPerPriceUnit;

  const rMultiple = riskAmount !== 0 ? pnl / riskAmount : null;

  return {
    pips: Number(pips.toFixed(2)),
    riskAmount: Number(riskAmount.toFixed(2)),
    pnl: Number(pnl.toFixed(2)),
    rMultiple: rMultiple !== null ? Number(rMultiple.toFixed(2)) : null,
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Unrelated to trade-price math: sizes a position's dollar risk from account balance and a risk %. */
export function calcRiskAmount(startingBalance: number, riskPercent: number): number {
  return round2(startingBalance * (riskPercent / 100));
}

export function inferResult(pnl: number): Result {
  return pnl >= 0 ? "Win" : "Loss";
}

interface AutoCalcInput {
  pair: string;
  direction: Direction;
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopLoss?: number | null;
  lotSize?: number | null;
}

interface AutoCalcOutput {
  pips: number | null;
  riskAmount: number | null;
  pnl: number | null;
  rMultiple: number | null;
  result: Result | null;
}

/**
 * Best-effort auto-calculation the trade form uses to pre-fill fields the
 * user can still override. This is a pure function of the price inputs —
 * it does NOT read back any previously-computed or user-typed risk/pnl
 * value, on purpose: feeding a field's own current state back in as an
 * "override" (via `input.x ?? computed.x`) creates a stale feedback loop,
 * since after the first calculation cycle the field always has *some*
 * value, so `??` permanently prefers the old one over the freshly
 * recomputed one even when entry/exit/stop/lot change afterward. Deciding
 * whether to actually apply a freshly computed value to a field the user
 * has manually edited is the UI layer's job (see the per-field "dirty"
 * flags in TradeForm), not this function's.
 */
export function autoCalcTrade(input: AutoCalcInput): AutoCalcOutput {
  const { pair, direction, entryPrice, stopLoss, exitPrice, lotSize } = input;

  if (entryPrice == null || stopLoss == null || exitPrice == null || lotSize == null) {
    return { pips: null, riskAmount: null, pnl: null, rMultiple: null, result: null };
  }

  const metrics = calculateTradeMetrics({ pair, direction, entryPrice, stopLoss, exitPrice, lotSize });
  const result = inferResult(metrics.pnl);

  return { pips: metrics.pips, riskAmount: metrics.riskAmount, pnl: metrics.pnl, rMultiple: metrics.rMultiple, result };
}
