"use client";

import { useRouter } from "next/navigation";
import { addMonths } from "@/lib/utils";

export function MonthNav({ monthKey, monthLabel, basePath }: { monthKey: string; monthLabel: string; basePath: string }) {
  const router = useRouter();

  function goTo(nextMonthKey: string) {
    router.push(`${basePath}?month=${nextMonthKey}`);
  }

  function shiftMonth(delta: number) {
    const asDate = addMonths(`${monthKey}-01`, delta);
    goTo(asDate.slice(0, 7));
  }

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="card flex flex-wrap items-center gap-1.5 px-4 py-3">
      <button type="button" onClick={() => shiftMonth(-1)} className="btn-ghost px-2.5">
        ← Prev month
      </button>
      <span className="px-2 font-display text-sm font-semibold text-charcoal">{monthLabel}</span>
      <button type="button" onClick={() => shiftMonth(1)} className="btn-ghost px-2.5">
        Next month →
      </button>
      {monthKey !== thisMonthKey && (
        <button type="button" onClick={() => goTo(thisMonthKey)} className="btn-ghost px-2.5 text-xs">
          This month
        </button>
      )}
    </div>
  );
}
