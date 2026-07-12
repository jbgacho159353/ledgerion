import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Redirects non-admins back to "/" with no indication the route exists. */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  if (!session?.user?.isAdmin) {
    redirect("/");
  }
  return userId as string;
}
