"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatShortDate, mondayOf, formatDateTime } from "@/lib/utils";
import { duplicateRosterWeek, approveRosterWeek, revertRosterWeekToDraft } from "@/lib/actions/roster";
import { PrintButton } from "@/components/audit-pack/print-button";
import type { RosterWeekStatus } from "@/lib/supabase/database.types";

/** The Roster header bar: Draft/Approved status, week navigation, Copy
 * previous week, Print and Approve roster — the brief's required controls,
 * all above the grid so they're visible on both screen and the print
 * layout (print:hidden hides the editing controls only, not the status/
 * date heading — see the print:hidden/print:block split below). */
export function RosterWeekNav({
  weekStartDate,
  weekId,
  hasWeekData,
  status,
  approvedByName,
  approvedAt,
  needsReview,
  lastModifiedAt,
  duplicateFromWeekId,
  duplicateFromLabel,
}: {
  weekStartDate: string;
  weekId: string | null;
  hasWeekData: boolean;
  status: RosterWeekStatus | null;
  approvedByName: string | null;
  approvedAt: string | null;
  needsReview: boolean;
  lastModifiedAt: string | null;
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

  function handleApprove() {
    if (!weekId) return;
    startTransition(async () => {
      await approveRosterWeek(weekId);
      router.refresh();
    });
  }

  function handleRevert() {
    if (!weekId) return;
    startTransition(async () => {
      await revertRosterWeekToDraft(weekId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 print:hidden">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => goToWeek(addDays(weekStartDate, -7))} className="btn-ghost px-2.5">
            ← Prev week
          </button>
          <span className="px-2 text-sm font-semibold text-charcoal">
            {formatShortDate(weekStartDate)} – {formatShortDate(addDays(weekStartDate, 4))}
          </span>
          <button type="button" onClick={() => goToWeek(addDays(weekStartDate, 7))} className="btn-ghost px-2.5">
            Next week →
          </button>
          <button type="button" onClick={() => goToWeek(mondayOf(new Date()))} className="btn-ghost px-2.5 text-xs">
            This week
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hasWeekData && duplicateFromWeekId && (
            <button type="button" onClick={handleDuplicate} disabled={pending} className="btn-secondary">
              {pending
                ? "Copying…"
                : `Copy previous week${duplicateFromLabel ? ` (${formatShortDate(duplicateFromLabel)})` : ""}`}
            </button>
          )}
          <PrintButton />
          {hasWeekData && status === "draft" && (
            <button type="button" onClick={handleApprove} disabled={pending} className="btn-primary">
              {pending ? "Approving…" : "✓ Approve roster"}
            </button>
          )}
          {hasWeekData && status === "approved" && (
            <button type="button" onClick={handleRevert} disabled={pending} className="btn-ghost text-xs">
              Revert to draft
            </button>
          )}
        </div>
      </div>

      {hasWeekData && status === "approved" && needsReview && (
        <div className="card border-l-4 border-l-status-attention px-4 py-2.5 text-sm text-charcoal/70 print:hidden">
          This week was approved, then changed{lastModifiedAt ? ` (last on ${formatDateTime(lastModifiedAt)})` : ""} —
          worth a quick re-check before relying on it as final.
        </div>
      )}

      {hasWeekData && status === "approved" && approvedByName && approvedAt && (
        <p className="hidden px-1 text-xs text-charcoal/40 print:block">
          Approved by {approvedByName} on {formatDateTime(approvedAt)}
        </p>
      )}
    </div>
  );
}
