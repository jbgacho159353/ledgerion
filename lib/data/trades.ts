import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface TradeFilters {
  pair?: string;
  session?: string;
  setup?: string;
  result?: string;
  /** Inclusive lower bound, "YYYY-MM-DD". */
  dateFrom?: string;
  /** Inclusive upper bound, "YYYY-MM-DD". */
  dateTo?: string;
  sortBy?: "tradeDate" | "pnl" | "pair" | "createdAt";
  sortDir?: "asc" | "desc";
  /** 1-indexed page number. */
  page?: number;
  pageSize?: number;
}

export const DEFAULT_TRADES_PAGE_SIZE = 25;

export interface PaginatedTrades {
  trades: Awaited<ReturnType<typeof prisma.trade.findMany>>;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Fetches one page of a user's trades, filtered and sorted server-side via Prisma skip/take. */
export async function getTradesForUser(userId: string, filters: TradeFilters = {}): Promise<PaginatedTrades> {
  const where: Prisma.TradeWhereInput = { userId };
  if (filters.pair) where.pair = filters.pair;
  if (filters.session) where.session = filters.session;
  if (filters.setup) where.setup = filters.setup;
  if (filters.result) where.result = filters.result;
  if (filters.dateFrom || filters.dateTo) {
    where.tradeDate = {
      ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T00:00:00.000Z`) } : {}),
    };
  }

  const sortBy = filters.sortBy ?? "tradeDate";
  const sortDir = filters.sortDir ?? "desc";
  // tradeDate ties (multiple trades on the same day) are broken by createdAt so ordering is stable.
  const orderBy: Prisma.TradeOrderByWithRelationInput[] =
    sortBy === "tradeDate" ? [{ tradeDate: sortDir }, { createdAt: sortDir }] : [{ [sortBy]: sortDir }];

  const pageSize = filters.pageSize ?? DEFAULT_TRADES_PAGE_SIZE;

  const totalCount = await prisma.trade.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), totalPages);

  const trades = await prisma.trade.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return { trades, totalCount, page, pageSize, totalPages };
}

export async function getAllTradesForUser(userId: string) {
  return prisma.trade.findMany({ where: { userId }, orderBy: { tradeDate: "asc" } });
}

export async function getTradesInRange(userId: string, start: Date, end: Date) {
  return prisma.trade.findMany({
    where: { userId, tradeDate: { gte: start, lt: end } },
    orderBy: { tradeDate: "asc" },
  });
}

export async function getLastTrade(userId: string) {
  return prisma.trade.findFirst({
    where: { userId },
    orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getDistinctFilterValues(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { userId },
    select: { pair: true, session: true, setup: true },
  });
  const pairs = Array.from(new Set(trades.map((t) => t.pair))).sort();
  const sessions = Array.from(new Set(trades.map((t) => t.session))).sort();
  const setups = Array.from(new Set(trades.map((t) => t.setup).filter(Boolean) as string[])).sort();
  return { pairs, sessions, setups };
}
