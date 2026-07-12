export function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyPlain(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Full currency formatting with thousands separators, e.g. "$11,955.82". No +/- sign — for account balances, not gains/losses. */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatR(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function trimTrailingDecimalZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/**
 * Compact currency formatting for tight spaces (e.g. calendar day cells).
 * Under $1,000: sign-prefixed dollar amount, 2 decimals only if not a whole
 * number (e.g. "+$300", "+$955.82", "-$40.50").
 * $1,000+: abbreviated to "k"/"M" with up to 1 decimal, trailing ".0"
 * dropped, no "+" prefix on positive values (e.g. "$1k", "$1.5k", "-$2.6k").
 */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${value < 0 ? "-" : ""}$${trimTrailingDecimalZero((abs / 1_000_000).toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    return `${value < 0 ? "-" : ""}$${trimTrailingDecimalZero((abs / 1_000).toFixed(1))}k`;
  }

  const sign = value >= 0 ? "+" : "-";
  const hasFraction = abs % 1 !== 0;
  return `${sign}$${hasFraction ? abs.toFixed(2) : abs.toFixed(0)}`;
}
