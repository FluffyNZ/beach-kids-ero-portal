"use client";

import { useRouter } from "next/navigation";
import { addDays, formatShortDate, mondayOf } from "@/lib/utils";

/** Same prev/next/this-week pattern as the roster's week nav, just without
 * the "duplicate from" option — a week's hours are entered fresh each
 * week, not copied. */
export function FeesWeekNav({ weekStartDate, basePath }: { weekStartDate: string; basePath: string }) {
  const router = useRouter();

  function goToWeek(date: string) {
    router.push(`${basePath}?week=${date}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-1.5 px-4 py-3">
      <button type="button" onClick={() => goToWeek(addDays(weekStartDate, -7))} className="btn-ghost px-2.5">
        ← Prev week
      </button>
      <span className="px-2 font-display text-sm font-semibold text-charcoal">
        Week of {formatShortDate(weekStartDate)}
      </span>
      <button type="button" onClick={() => goToWeek(addDays(weekStartDate, 7))} className="btn-ghost px-2.5">
        Next week →
      </button>
      <button type="button" onClick={() => goToWeek(mondayOf(new Date()))} className="btn-ghost px-2.5 text-xs">
        This week
      </button>
    </div>
  );
}
