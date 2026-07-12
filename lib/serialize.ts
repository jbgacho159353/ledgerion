import type { Trade } from "@prisma/client";

export interface SerializedTrade {
  id: string;
  userId: string;
  tradeDate: string;
  pair: string;
  session: string;
  direction: string;
  lotSize: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  pips: number | null;
  riskAmount: number | null;
  pnl: number;
  rMultiple: number | null;
  setup: string | null;
  result: string;
  notes: string | null;
  createdAt: string;
}

export function serializeTrade(t: Trade): SerializedTrade {
  return {
    id: t.id,
    userId: t.userId,
    tradeDate: t.tradeDate.toISOString().slice(0, 10),
    pair: t.pair,
    session: t.session,
    direction: t.direction,
    lotSize: t.lotSize != null ? Number(t.lotSize) : null,
    entryPrice: t.entryPrice != null ? Number(t.entryPrice) : null,
    stopLoss: t.stopLoss != null ? Number(t.stopLoss) : null,
    takeProfit: t.takeProfit != null ? Number(t.takeProfit) : null,
    exitPrice: t.exitPrice != null ? Number(t.exitPrice) : null,
    pips: t.pips != null ? Number(t.pips) : null,
    riskAmount: t.riskAmount != null ? Number(t.riskAmount) : null,
    pnl: Number(t.pnl),
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    setup: t.setup,
    result: t.result,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  };
}

export function serializeTrades(trades: Trade[]): SerializedTrade[] {
  return trades.map(serializeTrade);
}
