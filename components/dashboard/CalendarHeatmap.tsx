"use client";

import { Fragment, useMemo, useState } from "react";
import type { SerializedTrade } from "@/lib/serialize";
import { formatCompactCurrency } from "@/lib/format";

interface Props {
  trades: SerializedTrade[];
}

interface DayStats {
  total: number;
  count: number;
}

interface Cell {
  day: number | null;
  dateStr: string | null;
  stats: DayStats | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function cellClass(total: number | null) {
  if (total == null) return "bg-white/[0.02] text-slate-600";
  if (total > 0) return "bg-win-soft";
  if (total < 0) return "bg-loss-soft";
  return "bg-white/[0.04] text-slate-400";
}

export default function CalendarHeatmap({ trades }: Props) {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const dayStats = useMemo(() => {
    const map = new Map<string, DayStats>();
    const prefix = `${year}-${pad(month + 1)}`;
    for (const t of trades) {
      if (!t.tradeDate.startsWith(prefix)) continue;
      const existing = map.get(t.tradeDate) ?? { total: 0, count: 0 };
      existing.total += t.pnl;
      existing.count += 1;
      map.set(t.tradeDate, existing);
    }
    return map;
  }, [trades, year, month]);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() is already 0 = Sunday ... 6 = Saturday, matching the Sun-start header.
  const startWeekday = firstDay.getDay();

  const cells: Cell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, dateStr: null, stats: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({ day: d, dateStr, stats: dayStats.get(dateStr) ?? null });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null, stats: null });

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthLabel = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  function shiftMonth(dir: 1 | -1) {
    setSelectedDate(null);
    setMonthDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + dir);
      return nd;
    });
  }

  function goToThisMonth() {
    setSelectedDate(null);
    const d = new Date();
    d.setDate(1);
    setMonthDate(d);
  }

  function selectDay(dateStr: string) {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  const selectedStats = selectedDate ? dayStats.get(selectedDate) ?? null : null;
  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="glass-card w-full p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-semibold text-slate-300">Calendar</h3>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            onClick={goToThisMonth}
            disabled={isCurrentMonth}
            className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
          >
            This month
          </button>
          <button onClick={() => shiftMonth(-1)} className="btn-secondary px-2 py-1 text-xs" aria-label="Previous month">
            ←
          </button>
          <span className="min-w-[110px] text-center text-xs text-slate-300">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} className="btn-secondary px-2 py-1 text-xs" aria-label="Next month">
            →
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 sm:hidden">
        <button
          onClick={() => shiftMonth(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white/[0.04] text-lg text-slate-300 transition-transform active:scale-90"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="flex flex-1 flex-col items-center">
          <span className="font-sans text-base font-bold text-white">{monthLabel}</span>
          <button
            onClick={goToThisMonth}
            disabled={isCurrentMonth}
            className="mt-0.5 text-[10px] font-medium text-neutral disabled:text-slate-600"
          >
            {isCurrentMonth ? "Viewing this month" : "Jump to today"}
          </button>
        </div>
        <button
          onClick={() => shiftMonth(1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white/[0.04] text-lg text-slate-300 transition-transform active:scale-90"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((c, i) => {
              const isToday = c.dateStr === todayStr;
              const isSelected = c.dateStr != null && c.dateStr === selectedDate;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={c.day == null}
                  onClick={() => c.dateStr && selectDay(c.dateStr)}
                  className={`flex aspect-square flex-col overflow-hidden rounded-lg px-1 py-1 text-left font-mono transition-transform sm:aspect-auto sm:h-[76px] sm:px-2 sm:py-1.5 ${cellClass(
                    c.stats?.total ?? null
                  )} ${c.day != null ? "active:scale-95 sm:cursor-default" : ""} ${
                    isToday ? "ring-2 ring-inset ring-gold/70" : ""
                  } ${isSelected ? "ring-2 ring-inset ring-neutral" : ""}`}
                >
                  {c.day != null && (
                    <>
                      <span className="text-left text-[9px] leading-none text-slate-500 sm:text-[10px]">{c.day}</span>
                      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 text-center">
                        {c.stats != null && (
                          <>
                            <span
                              className={`truncate text-[11px] font-bold leading-tight sm:text-sm ${
                                c.stats.total >= 0 ? "text-win" : "text-loss"
                              }`}
                            >
                              {formatCompactCurrency(c.stats.total)}
                            </span>
                            <span className="hidden truncate text-[9px] leading-none text-slate-500 sm:block">
                              {c.stats.count} trade{c.stats.count === 1 ? "" : "s"}
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 sm:hidden">
            {selectedDate ? (
              <div className="animate-fade-up flex items-center justify-between rounded-xl border border-border bg-white/[0.04] px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500">{selectedLabel}</p>
                  <p
                    className={`mt-0.5 font-mono text-lg font-bold ${
                      !selectedStats ? "text-slate-500" : selectedStats.total >= 0 ? "text-win" : "text-loss"
                    }`}
                  >
                    {selectedStats ? formatCompactCurrency(selectedStats.total) : "No trades"}
                  </p>
                </div>
                {selectedStats && (
                  <p className="font-mono text-xs text-slate-400">
                    {selectedStats.count} trade{selectedStats.count === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-[11px] text-slate-600">Tap a day to see details</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:w-[150px]">
          <div className="invisible hidden text-center text-xs text-slate-500 lg:block">Week</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {weeks.map((week, wi) => {
              const tradedDays = week.filter((c) => c.stats != null);
              const weekTotal = tradedDays.reduce((sum, c) => sum + (c.stats?.total ?? 0), 0);
              const hasTrades = tradedDays.length > 0;
              return (
                <Fragment key={wi}>
                  <div
                    className={`flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-2 py-1.5 font-mono lg:h-[76px] ${
                      hasTrades ? cellClass(weekTotal) : "bg-white/[0.02] text-slate-600"
                    }`}
                  >
                    <span className="truncate text-[10px] leading-none text-slate-500">
                      Week {wi + 1}
                    </span>
                    <span
                      className={`truncate text-sm font-bold leading-tight ${
                        !hasTrades ? "text-slate-600" : weekTotal >= 0 ? "text-win" : "text-loss"
                      }`}
                    >
                      {hasTrades ? formatCompactCurrency(weekTotal) : "—"}
                    </span>
                    <span className="truncate text-[9px] leading-none text-slate-500">
                      {tradedDays.length} day{tradedDays.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
