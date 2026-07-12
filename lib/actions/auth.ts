"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { requireUserId } from "@/lib/session";

export async function signup(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!email || !password) return "Email and password are required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (confirmPassword != null && password !== confirmPassword) return "Passwords do not match.";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "An account with this email already exists.";

  const passwordHash = await hash(password, 10);

  // status defaults to "pending" and isAdmin to false per the schema — an
  // admin must approve before the account can log in or gets its
  // Account/default Sessions/Setups rows (see lib/actions/admin.ts).
  await prisma.user.create({
    data: { email, passwordHash },
  });

  redirect("/signup/pending");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const password = formData.get("password") as string | null;

  if (!email || !password) return "Email and password are required.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await compare(password, user.passwordHash))) {
    return "Invalid email or password.";
  }
  if (user.status === "pending") return "Your account is pending admin approval.";
  if (user.status === "rejected") return "Your account was not approved.";

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Something went wrong. Please try again.";
      }
    }
    throw error;
  }
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const userId = await requireUserId();

  if (input.newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  if (input.newPassword !== input.confirmPassword) {
    throw new Error("New password and confirmation do not match.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const isValid = await compare(input.currentPassword, user.passwordHash);
  if (!isValid) throw new Error("Current password is incorrect.");

  const passwordHash = await hash(input.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/** Permanently deletes the current user and all owned data (Account/Trade/Session/Setup cascade via the schema's onDelete: Cascade), then signs out. */
export async function deleteAccount() {
  const userId = await requireUserId();

  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/login" });
}
