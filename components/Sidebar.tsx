"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { signOutAction } from "@/lib/actions/auth";

export default function Sidebar({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-bg-soft/80 backdrop-blur-md md:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900/60">
          <Image src="/lion-logo.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
        </span>
        <span className="font-sans text-lg font-semibold text-white">
          Ledgerion
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-neutral-soft text-neutral"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin/users"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-neutral-soft text-neutral"
                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
            }`}
          >
            <span>🛡️</span>
            Admin
          </Link>
        )}
      </nav>
      <div className="border-t border-border px-4 py-4">
        <p className="truncate text-xs text-slate-500">{email}</p>
        <form action={signOutAction} className="mt-2">
          <button type="submit" className="btn-secondary w-full text-xs">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
