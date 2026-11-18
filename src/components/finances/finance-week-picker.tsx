"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, mondayOfDateString } from "@/lib/utils";
import { fmtWeek } from "@/lib/finance-format";

/** Billing-week picker: previous/next week, any date (snapped to its
 * Monday), and back to the current week. */
export function FinanceWeekPicker({
  weekStart,
  thisWeek,
  basePath,
  extraParams,
}: {
  weekStart: string;
  thisWeek: string;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(week: string) {
    const qs = new URLSearchParams({ ...(extraParams ?? {}), week });
    startTransition(() => router.push(`${basePath}?${qs.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="billing-week" className="mb-1.5 block text-sm font-medium text-charcoal">
          Billing week
        </label>
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn-secondary px-2.5 py-1.5" aria-label="Previous week" onClick={() => go(addDays(weekStart, -7))}>
            ←
          </button>
          <input
            id="billing-week"
            type="date"
            className="input w-40 py-1.5"
            value={weekStart}
            onChange={(e) => e.target.value && go(mondayOfDateString(e.target.value))}
          />
          <button type="button" className="btn-secondary px-2.5 py-1.5" aria-label="Next week" onClick={() => go(addDays(weekStart, 7))}>
            →
          </button>
          {weekStart !== thisWeek && (
            <button type="button" className="btn-ghost px-2.5 py-1.5" onClick={() => go(thisWeek)}>
              This week
            </button>
          )}
        </div>
      </div>
      <p className="pb-2 text-sm text-charcoal/70" aria-live="polite">
        {pending ? "Loading…" : `Mon–Fri ${fmtWeek(weekStart)}`}
      </p>
    </div>
  );
}
