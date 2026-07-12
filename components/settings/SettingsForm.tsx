"use client";

import { useState, useTransition } from "react";
import { updateAccount } from "@/lib/actions/account";

interface Props {
  startingBalance: number;
  riskPercent: number;
}

export default function SettingsForm({ startingBalance, riskPercent }: Props) {
  const [balance, setBalance] = useState(startingBalance.toString());
  const [risk, setRisk] = useState(riskPercent.toString());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const balanceNum = Number(balance);
    const riskNum = Number(risk);

    if (Number.isNaN(balanceNum) || balanceNum <= 0) {
      setMessage({ type: "error", text: "Starting balance must be a positive number." });
      return;
    }
    if (Number.isNaN(riskNum) || riskNum <= 0 || riskNum > 100) {
      setMessage({ type: "error", text: "Risk % must be between 0 and 100." });
      return;
    }

    startTransition(async () => {
      try {
        await updateAccount({ startingBalance: balanceNum, riskPercent: riskNum });
        setMessage({ type: "success", text: "Settings saved." });
      } catch {
        setMessage({ type: "error", text: "Failed to save settings." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card h-full animate-fade-up space-y-5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-base">
          💰
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Account &amp; risk</h2>
          <p className="mt-0.5 text-xs text-slate-500">Baseline balance and default risk sizing.</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Starting balance ($)</label>
        <input
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="input-field font-mono"
        />
        <p className="mt-1 text-xs text-slate-500">
          Used as the baseline for your equity curve and account growth calculations.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Risk per trade (%)</label>
        <input
          type="number"
          step="0.1"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className="input-field font-mono"
        />
        <p className="mt-1 text-xs text-slate-500">
          Used to estimate risk amount when logging a trade without an explicit stop-loss distance.
        </p>
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
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
