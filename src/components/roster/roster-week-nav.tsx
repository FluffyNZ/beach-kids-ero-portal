"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatShortDate, mondayOf } from "@/lib/utils";
import { duplicateRosterWeek } from "@/lib/actions/roster";

export function RosterWeekNav({
  weekStartDate,
  hasWeekData,
  duplicateFromWeekId,
  duplicateFromLabel,
}: {
  weekStartDate: string;
  hasWeekData: boolean;
  duplicateFromWeekId: string | null;
  duplicateFromLabel: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function goToWeek(date: string) {
    router.push(`/roster?week=${date}`);
  }

  function handleDuplicate() {
    if (!duplicateFromWeekId) return;
    startTransition(async () => {
      await duplicateRosterWeek(duplicateFromWeekId, weekStartDate);
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5">
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

      {!hasWeekData && duplicateFromWeekId && (
        <button type="button" onClick={handleDuplicate} disabled={pending} className="btn-secondary">
          {pending
            ? "Copying…"
            : `Copy from week of ${duplicateFromLabel ? formatShortDate(duplicateFromLabel) : "the last roster"}`}
        </button>
      )}
    </div>
  );
}
