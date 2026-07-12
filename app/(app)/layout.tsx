import type { ReactNode } from "react";
import { auth } from "@/auth";
import { requireUserId } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUserId();
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session?.user?.email ?? ""} isAdmin={!!session?.user?.isAdmin} />
      <div className="flex-1 pb-24 md:pb-0 md:pl-64">
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
