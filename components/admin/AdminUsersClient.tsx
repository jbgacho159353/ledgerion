"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import KpiCard from "@/components/KpiCard";

interface PendingUser {
  id: string;
  email: string;
  createdAt: string;
}

interface ApprovedUser extends PendingUser {
  isAdmin: boolean;
}

interface Props {
  pending: PendingUser[];
  approved: ApprovedUser[];
  onApprove: (userId: string) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

function Avatar({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold ${
        isAdmin ? "bg-gold-soft text-gold" : "bg-neutral-soft text-neutral"
      }`}
    >
      {initial}
    </div>
  );
}

export default function AdminUsersClient({ pending, approved, onApprove, onReject, onDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const adminCount = approved.filter((u) => u.isAdmin).length;

  function handleAction(userId: string, action: (id: string) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action(userId);
        router.refresh();
      } catch (err) {
        setError({ id: userId, message: err instanceof Error ? err.message : "Action failed." });
      }
    });
  }

  function handleDelete(userId: string, email: string) {
    if (!window.confirm(`Permanently delete ${email}? This removes all their trades and cannot be undone.`)) {
      return;
    }
    handleAction(userId, onDelete);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pending approval" value={pending.length.toString()} valueClassName="text-gold" />
        <KpiCard label="Approved users" value={approved.length.toString()} valueClassName="text-win" />
        <KpiCard label="Admins" value={adminCount.toString()} />
      </div>

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-base">
            ⏳
          </div>
          <div className="flex-1">
            <h2 className="font-sans text-sm font-semibold text-white">Pending approval</h2>
            <p className="mt-0.5 text-xs text-slate-500">New signups waiting for a decision.</p>
          </div>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-400">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">No pending signups.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Signed up</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar email={u.email} />
                        <span className="max-w-[200px] truncate text-slate-200" title={u.email}>
                          {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{u.createdAt.slice(0, 10)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleAction(u.id, onApprove)}
                          disabled={isPending}
                          className="text-xs font-medium text-win hover:underline disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(u.id, onReject)}
                          disabled={isPending}
                          className="text-xs font-medium text-gold hover:underline disabled:opacity-40"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          disabled={isPending}
                          className="text-xs font-medium text-loss hover:underline disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                      {error?.id === u.id && <p className="mt-1 text-xs text-loss">{error.message}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-win-soft text-base">
            ✅
          </div>
          <div className="flex-1">
            <h2 className="font-sans text-sm font-semibold text-white">Approved users</h2>
            <p className="mt-0.5 text-xs text-slate-500">Everyone with active access.</p>
          </div>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-400">
            {approved.length}
          </span>
        </div>
        {approved.length === 0 ? (
          <p className="text-sm text-slate-500">No approved users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar email={u.email} isAdmin={u.isAdmin} />
                        <span className="max-w-[200px] truncate text-slate-200" title={u.email}>
                          {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {u.isAdmin ? (
                        <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-medium text-gold">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Member</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{u.createdAt.slice(0, 10)}</td>
                    <td className="py-2.5 text-right">
                      {u.isAdmin ? (
                        <span className="text-xs text-slate-600">—</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          disabled={isPending}
                          className="text-xs font-medium text-loss hover:underline disabled:opacity-40"
                        >
                          Delete
                        </button>
                      )}
                      {error?.id === u.id && <p className="mt-1 text-xs text-loss">{error.message}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
