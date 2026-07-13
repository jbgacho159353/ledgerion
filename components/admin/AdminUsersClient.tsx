"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

type Tint = "gold" | "win" | "pro" | "neutral";

const TINT_CLASSES: Record<Tint, { bg: string; text: string }> = {
  gold: { bg: "bg-gold-soft", text: "text-gold" },
  win: { bg: "bg-win-soft", text: "text-win" },
  pro: { bg: "bg-pro-soft", text: "text-pro" },
  neutral: { bg: "bg-white/[0.04]", text: "text-slate-300" },
};

function StatCard({
  icon,
  label,
  value,
  badgeTint,
  valueTint,
}: {
  icon: string;
  label: string;
  value: number;
  badgeTint: Tint;
  valueTint: Tint;
}) {
  const badge = TINT_CLASSES[badgeTint];
  return (
    <div className="glass-card flex items-center gap-3 p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${badge.bg} ${badge.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className={`font-mono text-xl font-semibold ${TINT_CLASSES[valueTint].text}`}>{value}</p>
      </div>
    </div>
  );
}

type UserRole = "admin" | "member" | "pending";

const ROLE_TINT: Record<UserRole, Tint> = { admin: "pro", member: "neutral", pending: "gold" };

function Avatar({ email, role }: { email: string; role: UserRole }) {
  const initial = email.charAt(0).toUpperCase();
  const tint = TINT_CLASSES[ROLE_TINT[role]];
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold ${tint.bg} ${tint.text}`}
    >
      {initial}
    </div>
  );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return isAdmin ? (
    <span className="rounded-full bg-pro-soft px-2.5 py-0.5 text-xs font-medium text-pro">Admin</span>
  ) : (
    <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-slate-400">Member</span>
  );
}

type ActionTone = "win" | "gold" | "loss";

const ACTION_TONE_CLASSES: Record<ActionTone, string> = {
  win: "border-win/30 text-win hover:bg-win-soft",
  gold: "border-gold/30 text-gold hover:bg-gold-soft",
  loss: "border-loss/30 text-loss hover:bg-loss-soft",
};

function ActionButton({
  onClick,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: ActionTone;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_TONE_CLASSES[tone]}`}
    >
      {children}
    </button>
  );
}

export default function AdminUsersClient({ pending, approved, onApprove, onReject, onDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [query, setQuery] = useState("");

  const adminCount = approved.filter((u) => u.isAdmin).length;
  const filteredApproved = approved.filter((u) => u.email.toLowerCase().includes(query.trim().toLowerCase()));

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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="⏳" label="Pending approval" value={pending.length} badgeTint="gold" valueTint="gold" />
        <StatCard icon="👥" label="Approved users" value={approved.length} badgeTint="win" valueTint="win" />
        <StatCard icon="🛡️" label="Admins" value={adminCount} badgeTint="pro" valueTint="neutral" />
      </div>

      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-3">
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
                        <Avatar email={u.email} role="pending" />
                        <span className="max-w-[200px] truncate text-slate-200" title={u.email}>
                          {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{u.createdAt.slice(0, 10)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ActionButton tone="win" onClick={() => handleAction(u.id, onApprove)} disabled={isPending}>
                          Approve
                        </ActionButton>
                        <ActionButton tone="gold" onClick={() => handleAction(u.id, onReject)} disabled={isPending}>
                          Reject
                        </ActionButton>
                        <ActionButton tone="loss" onClick={() => handleDelete(u.id, u.email)} disabled={isPending}>
                          Delete
                        </ActionButton>
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

      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-win-soft text-base">
            👥
          </div>
          <div className="flex-1">
            <h2 className="font-sans text-sm font-semibold text-white">Approved users</h2>
            <p className="mt-0.5 text-xs text-slate-500">Everyone with active access.</p>
          </div>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-400">
            {approved.length}
          </span>
        </div>

        {approved.length > 0 && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email…"
            className="input-field mb-3 max-w-xs"
          />
        )}

        {approved.length === 0 ? (
          <p className="text-sm text-slate-500">No approved users yet.</p>
        ) : filteredApproved.length === 0 ? (
          <p className="text-sm text-slate-500">No users match &ldquo;{query}&rdquo;.</p>
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
                {filteredApproved.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar email={u.email} role={u.isAdmin ? "admin" : "member"} />
                        <span className="max-w-[200px] truncate text-slate-200" title={u.email}>
                          {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <RoleBadge isAdmin={u.isAdmin} />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{u.createdAt.slice(0, 10)}</td>
                    <td className="py-2.5 text-right">
                      {u.isAdmin ? (
                        <span className="text-xs text-slate-600">No actions</span>
                      ) : (
                        <ActionButton tone="loss" onClick={() => handleDelete(u.id, u.email)} disabled={isPending}>
                          Delete
                        </ActionButton>
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
