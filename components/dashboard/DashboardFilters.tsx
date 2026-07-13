"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, DEFAULT_PAIR, DEFAULT_SETUP, type RangeKey } from "@/lib/dashboardFilters";

interface Props {
  activeRange: RangeKey;
  activePair: string;
  activeSetup: string;
  pairs: string[];
  setups: string[];
}

export default function DashboardFilters({ activeRange, activePair, activeSetup, pairs, setups }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: "range" | "pair" | "setup", value: string, defaultValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white/[0.02] p-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => updateParam("range", opt.key, "all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeRange === opt.key
                ? "bg-neutral text-white"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={activePair}
          onChange={(e) => updateParam("pair", e.target.value, DEFAULT_PAIR)}
          className="input-field w-auto min-w-[130px] py-1.5 text-xs"
        >
          <option value={DEFAULT_PAIR}>All pairs</option>
          {pairs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={activeSetup}
          onChange={(e) => updateParam("setup", e.target.value, DEFAULT_SETUP)}
          className="input-field w-auto min-w-[130px] py-1.5 text-xs"
        >
          <option value={DEFAULT_SETUP}>All setups</option>
          {setups.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
