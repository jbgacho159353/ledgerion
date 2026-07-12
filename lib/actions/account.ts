"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function updateAccount(input: { startingBalance: number; riskPercent: number }) {
  const userId = await requireUserId();

  if (Number.isNaN(input.startingBalance) || Number.isNaN(input.riskPercent)) {
    throw new Error("Invalid account values.");
  }

  await prisma.account.upsert({
    where: { userId },
    update: {
      startingBalance: input.startingBalance,
      riskPercent: input.riskPercent,
    },
    create: {
      userId,
      startingBalance: input.startingBalance,
      riskPercent: input.riskPercent,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/reports");
}
