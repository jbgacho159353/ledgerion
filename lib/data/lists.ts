import { prisma } from "@/lib/prisma";

export async function getSessionsForUser(userId: string) {
  return prisma.session.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function getSetupsForUser(userId: string) {
  return prisma.setup.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

/** Trade counts keyed by the exact session-name string, for the "used by N trades" delete guard. */
export async function getSessionUsageCounts(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.trade.groupBy({ by: ["session"], where: { userId }, _count: { session: true } });
  return new Map(rows.map((r) => [r.session, r._count.session]));
}

/** Trade counts keyed by the exact setup-name string, for the "used by N trades" delete guard. */
export async function getSetupUsageCounts(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.trade.groupBy({
    by: ["setup"],
    where: { userId, setup: { not: null } },
    _count: { setup: true },
  });
  return new Map(rows.map((r) => [r.setup as string, r._count.setup]));
}
