"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const DEFAULT_SESSIONS = ["London", "New York", "Asia/Tokyo"];
const DEFAULT_SETUPS = [
  "Break & Retest",
  "Liquidity Sweep",
  "Order Block",
  "FVG Fill",
  "Trend Continuation",
  "Range Play",
  "CRT",
];

/** Creates the Account + default Sessions/Setups for a newly-approved user, if not already present. */
async function provisionApprovedUser(userId: string) {
  const existingAccount = await prisma.account.findUnique({ where: { userId } });
  if (!existingAccount) {
    await prisma.account.create({ data: { userId, startingBalance: 10000, riskPercent: 1.0 } });
  }

  const existingSessions = await prisma.session.count({ where: { userId } });
  if (existingSessions === 0) {
    await prisma.session.createMany({ data: DEFAULT_SESSIONS.map((name) => ({ userId, name })) });
  }

  const existingSetups = await prisma.setup.count({ where: { userId } });
  if (existingSetups === 0) {
    await prisma.setup.createMany({ data: DEFAULT_SETUPS.map((name) => ({ userId, name })) });
  }
}

export async function approveUser(userId: string) {
  await requireAdmin();

  await prisma.user.update({ where: { id: userId }, data: { status: "approved" } });
  await provisionApprovedUser(userId);

  revalidatePath("/admin/users");
}

export async function rejectUser(userId: string) {
  await requireAdmin();

  await prisma.user.update({ where: { id: userId }, data: { status: "rejected" } });

  revalidatePath("/admin/users");
}

/** Permanently deletes a user (and their Account/Trade/Session/Setup rows, via onDelete: Cascade). Admin accounts are never deletable through this action. */
export async function deleteUser(userId: string) {
  await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!target) throw new Error("User not found.");
  if (target.isAdmin) throw new Error("Admin accounts cannot be deleted.");

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
}
