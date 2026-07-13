import type { ReactNode } from "react";

interface Props {
  label: ReactNode;
  value: string;
  valueClassName?: string;
  sub?: ReactNode;
  sparkline?: ReactNode;
}

export default function KpiCard({ label, value, valueClassName, sub, sparkline }: Props) {
  return (
    <div className="glass-card flex min-h-[120px] flex-col justify-center p-5">
      <p className="truncate text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 w-full truncate font-mono text-2xl font-semibold ${valueClassName ?? "text-white"}`}
        title={value}
      >
        {value}
      </p>
      {sparkline && <div className="mt-2 h-6 w-full">{sparkline}</div>}
      {sub && <div className="mt-1.5 truncate">{sub}</div>}
    </div>
  );
}
