"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

function revalidateAll() {
  revalidatePath("/trades");
  revalidatePath("/settings");
}

async function assertUniqueSessionName(userId: string, name: string) {
  const existing = await prisma.session.findMany({ where: { userId }, select: { name: true } });
  if (existing.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" already exists.`);
  }
}

async function assertUniqueSetupName(userId: string, name: string) {
  const existing = await prisma.setup.findMany({ where: { userId }, select: { name: true } });
  if (existing.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" already exists.`);
  }
}

export async function createSession(name: string) {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Session name is required.");
  await assertUniqueSessionName(userId, trimmed);
  await prisma.session.create({ data: { userId, name: trimmed } });
  revalidateAll();
}

export async function deleteSession(id: string) {
  const userId = await requireUserId();
  const record = await prisma.session.findUnique({ where: { id } });
  if (!record || record.userId !== userId) throw new Error("Session not found.");

  const usageCount = await prisma.trade.count({ where: { userId, session: record.name } });
  if (usageCount > 0) {
    throw new Error(`Can't delete — used by ${usageCount} trade${usageCount === 1 ? "" : "s"}.`);
  }
  await prisma.session.delete({ where: { id } });
  revalidateAll();
}

export async function createSetup(name: string) {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Setup name is required.");
  await assertUniqueSetupName(userId, trimmed);
  await prisma.setup.create({ data: { userId, name: trimmed } });
  revalidateAll();
}

export async function deleteSetup(id: string) {
  const userId = await requireUserId();
  const record = await prisma.setup.findUnique({ where: { id } });
  if (!record || record.userId !== userId) throw new Error("Setup not found.");

  const usageCount = await prisma.trade.count({ where: { userId, setup: record.name } });
  if (usageCount > 0) {
    throw new Error(`Can't delete — used by ${usageCount} trade${usageCount === 1 ? "" : "s"}.`);
  }
  await prisma.setup.delete({ where: { id } });
  revalidateAll();
}
