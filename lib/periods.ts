export type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Trade dates are stored and serialized as plain UTC calendar dates (see
 * lib/serialize.ts, `t.tradeDate.toISOString().slice(0, 10)`), with no
 * timezone meaning attached. Period boundaries must be computed the same
 * way — using UTC getters/setters — so they always line up with the stored
 * dates. Using local-timezone methods here would shift the boundaries by a
 * day for any user whose browser/server offset isn't UTC.
 */
function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function getPeriodRange(type: PeriodType, anchor: Date): PeriodRange {
  const a = startOfUTCDay(anchor);

  if (type === "daily") {
    const start = a;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return {
      start,
      end,
      label: start.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
    };
  }

  if (type === "weekly") {
    const day = a.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(a);
    start.setUTCDate(a.getUTCDate() - diffToMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    const lastDay = new Date(end);
    lastDay.setUTCDate(lastDay.getUTCDate() - 1);
    return {
      start,
      end,
      label: `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })} – ${lastDay.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })}`,
    };
  }

  if (type === "monthly") {
    const start = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
    const end = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1));
    return {
      start,
      end,
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }

  const start = new Date(Date.UTC(a.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(a.getUTCFullYear() + 1, 0, 1));
  return { start, end, label: `${a.getUTCFullYear()}` };
}

export function shiftAnchor(type: PeriodType, anchor: Date, direction: 1 | -1): Date {
  const a = new Date(anchor);
  if (type === "daily") a.setUTCDate(a.getUTCDate() + direction);
  else if (type === "weekly") a.setUTCDate(a.getUTCDate() + direction * 7);
  else if (type === "monthly") a.setUTCMonth(a.getUTCMonth() + direction);
  else a.setUTCFullYear(a.getUTCFullYear() + direction);
  return a;
}

export function getPreviousEqualRange(range: PeriodRange): PeriodRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  const start = new Date(range.start.getTime() - durationMs);
  const end = new Date(range.start);
  return { start, end, label: "Previous period" };
}

export function isFutureAnchor(type: PeriodType, anchor: Date): boolean {
  const range = getPeriodRange(type, anchor);
  return range.start.getTime() > Date.now();
}
