import { prisma } from "@/lib/prisma";

export async function getPendingUsers() {
  return prisma.user.findMany({
    where: { status: "pending" },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getApprovedUsers() {
  return prisma.user.findMany({
    where: { status: "approved" },
    select: { id: true, email: true, createdAt: true, isAdmin: true },
    orderBy: { createdAt: "asc" },
  });
}
