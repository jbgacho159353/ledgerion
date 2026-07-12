"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/actions/auth";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    startTransition(async () => {
      try {
        await changePassword({ currentPassword, newPassword, confirmPassword });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage({ type: "success", text: "Password changed successfully." });
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to change password." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card h-full animate-fade-up space-y-4 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-soft text-base">
          🔒
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Change password</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Doesn't affect your approval status — you can change this anytime.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Current password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-300">New password</label>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="input-field"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-300">Confirm new password</label>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="input-field"
        />
      </div>

      {message && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-win/30 bg-win-soft text-win"
              : "border-loss/30 bg-loss-soft text-loss"
          }`}
        >
          {message.text}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
