"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/actions/auth";

export default function DeleteAccountForm() {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const canSubmit = confirmText === "DELETE" && !isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (confirmText !== "DELETE") {
      setError('Type "DELETE" to confirm.');
      return;
    }
    if (
      !window.confirm(
        "This will permanently delete your account and every trade you've logged. This cannot be undone. Continue?"
      )
    ) {
      return;
    }

    setIsPending(true);
    try {
      await deleteAccount();
    } catch (err) {
      setIsPending(false);
      setError(err instanceof Error ? err.message : "Failed to delete account.");
    }
  }

  return (
    <div className="glass-card animate-fade-up space-y-4 border-loss/30 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-loss-soft text-base">
          ⚠️
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold text-loss">Danger zone</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Permanently delete your account and every trade you've logged. This cannot be undone.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Type <span className="font-mono text-loss">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="input-field font-mono"
            placeholder="DELETE"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-sm text-loss">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-lg border border-loss/40 bg-loss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-loss/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </div>
  );
}
