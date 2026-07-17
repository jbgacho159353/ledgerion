"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { Direction, Result } from "@/lib/calculations";

export interface TradeInput {
  tradeDate: string;
  pair: string;
  session: string;
  direction: Direction;
  lotSize?: number | null;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  exitPrice?: number | null;
  pips?: number | null;
  riskAmount?: number | null;
  pnl: number;
  rMultiple?: number | null;
  setup?: string | null;
  result: Result;
  notes?: string | null;
}

function n(v?: number | null) {
  return v == null || Number.isNaN(v) ? null : v;
}

/**
 * Parses a "YYYY-MM-DD" string (from the <input type="date"> form field) as
 * a UTC calendar date, explicitly — not relying on `new Date("YYYY-MM-DD")`
 * implicitly being UTC per spec, since that's easy to break (e.g. if the
 * string ever gains a time component). This must match how tradeDate is
 * read back out via `.toISOString().slice(0, 10)` in lib/serialize.ts, so
 * the date the user typed is always the date stored and displayed.
 */
function parseTradeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function buildData(input: TradeInput) {
  return {
    tradeDate: parseTradeDate(input.tradeDate),
    pair: input.pair.toUpperCase().trim(),
    session: input.session,
    direction: input.direction,
    lotSize: n(input.lotSize),
    entryPrice: n(input.entryPrice),
    stopLoss: n(input.stopLoss),
    takeProfit: n(input.takeProfit),
    exitPrice: n(input.exitPrice),
    pips: n(input.pips),
    riskAmount: n(input.riskAmount),
    pnl: input.pnl,
    rMultiple: n(input.rMultiple),
    setup: input.setup?.trim() || null,
    result: input.result,
    notes: input.notes?.trim() || null,
  };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/reports");
}

export async function createTrade(input: TradeInput) {
  const userId = await requireUserId();

  await prisma.trade.create({
    data: {
      userId,
      ...buildData(input),
    },
  });

  revalidateAll();
}

export async function updateTrade(id: string, input: TradeInput) {
  const userId = await requireUserId();

  const existing = await prisma.trade.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Trade not found.");
  }

  await prisma.trade.update({
    where: { id },
    data: buildData(input),
  });

  revalidateAll();
}

export async function deleteTrade(id: string) {
  const userId = await requireUserId();

  const existing = await prisma.trade.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Trade not found.");
  }

  await prisma.trade.delete({ where: { id } });

  revalidateAll();
}
