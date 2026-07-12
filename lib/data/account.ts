import { prisma } from "@/lib/prisma";

export async function getAccountForUser(userId: string) {
  let account = await prisma.account.findUnique({ where: { userId } });
  if (!account) {
    account = await prisma.account.create({
      data: { userId, startingBalance: 10000, riskPercent: 1.0 },
    });
  }
  return account;
}
