"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createTrade, updateTrade, type TradeInput } from "@/lib/actions/trades";
import Link from "next/link";
import { autoCalcTrade, type Direction, type Result } from "@/lib/calculations";
import { COMMON_PAIRS } from "@/lib/constants";
import type { SerializedTrade } from "@/lib/serialize";

interface ListItem {
  id: string;
  name: string;
}

interface TradeFormProps {
  userId: string;
  initialTrade: SerializedTrade | null;
  duplicateSeed: SerializedTrade | null;
  knownPairs: string[];
  sessions: ListItem[];
  setups: ListItem[];
  onClose: () => void;
  onSaved: () => void;
}

interface LastUsed {
  session?: string;
  setup?: string;
}

function lastUsedKey(userId: string) {
  return `tj:lastUsed:${userId}`;
}

function readLastUsed(userId: string): LastUsed {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(lastUsedKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLastUsed(userId: string, value: LastUsed) {
  try {
    window.localStorage.setItem(lastUsedKey(userId), JSON.stringify(value));
  } catch {
    // localStorage unavailable — non-critical convenience feature
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TradeForm({
  userId,
  initialTrade,
  duplicateSeed,
  knownPairs,
  sessions,
  setups,
  onClose,
  onSaved,
}: TradeFormProps) {
  const isEditing = !!initialTrade;
  const seed = initialTrade ?? duplicateSeed;
  const lastUsed = useMemo(() => (!seed ? readLastUsed(userId) : {}), [seed, userId]);

  const [tradeDate, setTradeDate] = useState(initialTrade?.tradeDate ?? todayISO());
  const [pair, setPair] = useState(seed?.pair ?? "");
  const [session, setSession] = useState(seed?.session ?? lastUsed.session ?? "");
  const [direction, setDirection] = useState<Direction>((seed?.direction as Direction) ?? "Long");
  const [lotSize, setLotSize] = useState(seed?.lotSize?.toString() ?? "");
  const [entryPrice, setEntryPrice] = useState(seed?.entryPrice?.toString() ?? "");
  const [stopLoss, setStopLoss] = useState(seed?.stopLoss?.toString() ?? "");
  const [takeProfit, setTakeProfit] = useState(seed?.takeProfit?.toString() ?? "");
  const [exitPrice, setExitPrice] = useState(seed?.exitPrice?.toString() ?? "");
  const [pips, setPips] = useState(seed?.pips?.toString() ?? "");
  const [riskAmount, setRiskAmount] = useState(seed?.riskAmount?.toString() ?? "");
  const [pnl, setPnl] = useState(seed?.pnl?.toString() ?? "");
  const [rMultiple, setRMultiple] = useState(seed?.rMultiple?.toString() ?? "");
  const [setup, setSetup] = useState(seed?.setup ?? lastUsed.setup ?? "");
  const [result, setResult] = useState<Result>((seed?.result as Result) ?? "Win");
  const [notes, setNotes] = useState(seed?.notes ?? "");

  // Duplicating pre-fills numeric fields from the seed trade too, so they must count as
  // "dirty" (user-set) just like editing — otherwise the auto-calc effect below would
  // immediately overwrite the duplicated values as soon as the form mounts.
  const hasSeed = !!seed;
  const [pipsDirty, setPipsDirty] = useState(hasSeed);
  const [riskDirty, setRiskDirty] = useState(hasSeed);
  const [pnlDirty, setPnlDirty] = useState(hasSeed);
  const [rMultipleDirty, setRMultipleDirty] = useState(hasSeed);
  const [resultDirty, setResultDirty] = useState(hasSeed);
  const [resultMismatchAck, setResultMismatchAck] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pnlNum = pnl.trim() === "" || Number.isNaN(Number(pnl)) ? null : Number(pnl);
  const resultMismatch =
    pnlNum != null && pnlNum !== 0 && ((pnlNum > 0 && result !== "Win") || (pnlNum < 0 && result !== "Loss"));
  const isBreakeven = pnlNum === 0;

  // Any change to P&L or Result invalidates a prior acknowledgement — a new
  // mismatch (or a fixed one) always needs a fresh look before saving.
  useEffect(() => {
    setResultMismatchAck(false);
  }, [pnl, result]);

  useEffect(() => {
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const auto = autoCalcTrade({
      pair: pair || "EURUSD",
      direction,
      entryPrice: num(entryPrice),
      exitPrice: num(exitPrice),
      stopLoss: num(stopLoss),
      lotSize: num(lotSize),
    });

    if (!pipsDirty && auto.pips != null) setPips(auto.pips.toString());
    if (!riskDirty && auto.riskAmount != null) setRiskAmount(auto.riskAmount.toString());
    if (!pnlDirty && auto.pnl != null) setPnl(auto.pnl.toString());
    if (!resultDirty && auto.result != null) setResult(auto.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, direction, entryPrice, exitPrice, stopLoss, lotSize]);

  // R multiple always derives from whatever risk/P&L are currently on screen
  // (auto-computed or manually overridden), so an override on either one
  // still cascades into R multiple correctly.
  useEffect(() => {
    if (rMultipleDirty) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const risk = num(riskAmount);
    const p = num(pnl);
    if (risk != null && risk !== 0 && p != null) {
      setRMultiple((Math.round((p / risk) * 100) / 100).toString());
    } else {
      setRMultiple("");
    }
  }, [riskAmount, pnl, rMultipleDirty]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pair.trim() || !session.trim() || !tradeDate) {
      setError("Date, pair, and session are required.");
      return;
    }
    if (pnl.trim() === "" || Number.isNaN(Number(pnl))) {
      setError("P&L is required.");
      return;
    }
    if (resultMismatch && !resultMismatchAck) {
      setError("Please confirm the P&L / Result mismatch below before saving.");
      return;
    }

    const input: TradeInput = {
      tradeDate,
      pair: pair.trim().toUpperCase(),
      session: session.trim(),
      direction,
      lotSize: lotSize.trim() === "" ? null : Number(lotSize),
      entryPrice: entryPrice.trim() === "" ? null : Number(entryPrice),
      stopLoss: stopLoss.trim() === "" ? null : Number(stopLoss),
      takeProfit: takeProfit.trim() === "" ? null : Number(takeProfit),
      exitPrice: exitPrice.trim() === "" ? null : Number(exitPrice),
      pips: pips.trim() === "" ? null : Number(pips),
      riskAmount: riskAmount.trim() === "" ? null : Number(riskAmount),
      pnl: Number(pnl),
      rMultiple: rMultiple.trim() === "" ? null : Number(rMultiple),
      setup: setup.trim() || null,
      result,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      try {
        if (isEditing && initialTrade) {
          await updateTrade(initialTrade.id, input);
        } else {
          await createTrade(input);
        }
        writeLastUsed(userId, { session: input.session, setup: input.setup ?? undefined });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save trade.");
      }
    });
  }

  const pairOptions = Array.from(new Set([...COMMON_PAIRS, ...knownPairs]));

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card w-full max-w-3xl animate-fade-up">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 pb-5 pt-7">
          <h2 className="font-sans text-xl font-semibold text-white">
            {isEditing ? "Edit trade" : duplicateSeed ? "Duplicate trade" : "Log new trade"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-300 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-scroll space-y-6 px-6 pb-7 pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Date</label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                required
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Pair</label>
              <input
                list="pair-options"
                value={pair}
                onChange={(e) => setPair(e.target.value.toUpperCase())}
                required
                placeholder="EURUSD"
                className="input-field font-mono"
              />
              <datalist id="pair-options">
                {pairOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
                className="input-field"
              >
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Session</label>
              {sessions.length === 0 ? (
                <p className="input-field flex items-center text-xs text-slate-500">
                  No sessions yet —{" "}
                  <Link href="/settings" className="ml-1 text-neutral hover:underline">
                    add one in Settings
                  </Link>
                </p>
              ) : (
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="" disabled>
                    Select a session…
                  </option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  {session && !sessions.some((s) => s.name === session) && (
                    <option value={session}>{session} (no longer in your list)</option>
                  )}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Setup</label>
              {setups.length === 0 ? (
                <p className="input-field flex items-center text-xs text-slate-500">
                  No setups yet —{" "}
                  <Link href="/settings" className="ml-1 text-neutral hover:underline">
                    add one in Settings
                  </Link>
                </p>
              ) : (
                <select value={setup} onChange={(e) => setSetup(e.target.value)} className="input-field">
                  <option value="">None</option>
                  {setups.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  {setup && !setups.some((s) => s.name === setup) && (
                    <option value={setup}>{setup} (no longer in your list)</option>
                  )}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Lot size</label>
              <input
                type="number"
                step="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Entry</label>
              <input
                type="number"
                step="0.00001"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Stop loss</label>
              <input
                type="number"
                step="0.00001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Take profit</label>
              <input
                type="number"
                step="0.00001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Exit</label>
              <input
                type="number"
                step="0.00001"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="input-field font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                Pips {pipsDirty && <span className="text-neutral">override</span>}
              </label>
              <input
                type="number"
                step="0.1"
                value={pips}
                onChange={(e) => {
                  setPips(e.target.value);
                  setPipsDirty(true);
                }}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                Risk $ {riskDirty && <span className="text-neutral">override</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={riskAmount}
                onChange={(e) => {
                  setRiskAmount(e.target.value);
                  setRiskDirty(true);
                }}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                P&L $ {pnlDirty && <span className="text-neutral">override</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={pnl}
                onChange={(e) => {
                  setPnl(e.target.value);
                  setPnlDirty(true);
                }}
                required
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                R multiple {rMultipleDirty && <span className="text-neutral">override</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={rMultiple}
                onChange={(e) => {
                  setRMultiple(e.target.value);
                  setRMultipleDirty(true);
                }}
                className="input-field font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-300">
                Result {resultDirty && <span className="text-neutral">override</span>}
              </label>
              <select
                value={result}
                onChange={(e) => {
                  setResult(e.target.value as Result);
                  setResultDirty(true);
                }}
                className="input-field w-32"
              >
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
              </select>
            </div>
          </div>

          {isBreakeven && (
            <p className="text-xs text-slate-500">
              This is a breakeven trade (P&amp;L = $0.00) — Result can be either Win or Loss.
            </p>
          )}

          {resultMismatch && (
            <div className="space-y-2 rounded-lg border border-gold/30 bg-gold-soft px-3 py-2.5">
              <p className="text-sm text-gold">
                {pnlNum != null && pnlNum > 0
                  ? "This trade shows a positive P&L but is marked as a Loss — please confirm this is correct."
                  : "This trade shows a negative P&L but is marked as a Win — please confirm this is correct."}
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={resultMismatchAck}
                  onChange={(e) => setResultMismatchAck(e.target.checked)}
                />
                I understand this looks contradictory and want to save it anyway (e.g. a partial close).
              </label>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-slate-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="What went well, what didn't, lessons learned…"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-sm text-loss">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Save trade"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
