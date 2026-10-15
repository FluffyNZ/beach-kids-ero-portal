"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StaffLeaveModal } from "./staff-leave-modal";
import { deleteStaffLeave, setStaffLeaveStatus } from "@/lib/actions/calendar";
import { STAFF_LEAVE_TYPE_LABEL, STAFF_LEAVE_STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type { StaffLeave } from "@/lib/types";
import type { StaffLeaveStatus } from "@/lib/supabase/database.types";

const STATUS_BADGE_CLASS: Record<StaffLeaveStatus, string> = {
  requested: "bg-status-attentionBg text-status-attention",
  approved: "bg-lilac-100 text-lilac-700",
  declined: "bg-status-actionBg text-status-action",
  cancelled: "bg-sand-200 text-charcoal/50",
};

/** The editable list of booked leave overlapping the displayed month/week,
 * with an "Add staff leave" button and per-row edit/delete — plus, since
 * Phase 2, a status badge and quick Approve/Decline/Cancel actions for
 * anything not already in a final state. Kept separate from the read-only
 * CalendarEventList (which mixes in holidays and birthdays you can't edit
 * here) and reused as-is on both the Centre Calendar and Roster → Leave &
 * availability — one editable list, not two. */
export function StaffLeaveManager({
  leave,
  staffOptions,
}: {
  leave: StaffLeave[];
  staffOptions: Array<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffLeave | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(l: StaffLeave) {
    setEditing(l);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteStaffLeave(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirmingId(null);
      router.refresh();
    });
  }

  function handleStatus(id: string, status: StaffLeaveStatus) {
    setError(null);
    setPendingStatusId(id);
    startTransition(async () => {
      const result = await setStaffLeaveStatus(id, status);
      setPendingStatusId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function timeRangeLabel(l: StaffLeave): string {
    if (!l.start_time || !l.end_time) return "";
    return ` · ${formatTime(l.start_time)}–${formatTime(l.end_time)}`;
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold text-charcoal">Staff leave</h2>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <PlusIcon className="h-4 w-4" />
          Add staff leave
        </button>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      {leave.length === 0 ? (
        <p className="text-sm text-charcoal/50">No leave booked that overlaps this period.</p>
      ) : (
        <div className="flex flex-col divide-y divide-charcoal/10">
          {leave.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-charcoal">
                  <Link href={`/staff/${l.staff_id}`} className="hover:underline">
                    {l.staff_name}
                  </Link>
                  <span className="font-normal text-charcoal/50">— {STAFF_LEAVE_TYPE_LABEL[l.leave_type]}</span>
                  <span className={`badge ${STATUS_BADGE_CLASS[l.status]}`}>{STAFF_LEAVE_STATUS_LABEL[l.status]}</span>
                </p>
                <p className="text-xs text-charcoal/50">
                  {formatDate(l.start_date)}
                  {l.end_date !== l.start_date ? ` – ${formatDate(l.end_date)}` : ""}
                  {timeRangeLabel(l)}
                  {l.notes ? ` · ${l.notes}` : ""}
                </p>
                {l.private_notes && <p className="text-xs italic text-charcoal/40">Private: {l.private_notes}</p>}
                {l.status !== "requested" && l.decided_by_name && (
                  <p className="text-[11px] text-charcoal/35">
                    {STAFF_LEAVE_STATUS_LABEL[l.status]} by {l.decided_by_name}
                    {l.decided_at ? ` on ${formatDate(l.decided_at.slice(0, 10))}` : ""}
                  </p>
                )}
              </div>

              {confirmingId === l.id ? (
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="text-charcoal/60">Delete this leave?</span>
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-danger px-2.5 py-1 text-xs"
                    onClick={() => handleDelete(l.id)}
                  >
                    {pending ? "Deleting…" : "Delete"}
                  </button>
                  <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  {l.status === "requested" && (
                    <>
                      <button
                        type="button"
                        disabled={pending && pendingStatusId === l.id}
                        className="btn-secondary px-2.5 py-1 text-xs"
                        onClick={() => handleStatus(l.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending && pendingStatusId === l.id}
                        className="btn-ghost px-2.5 py-1 text-xs text-status-action hover:bg-status-actionBg"
                        onClick={() => handleStatus(l.id, "declined")}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {l.status === "approved" && (
                    <button
                      type="button"
                      disabled={pending && pendingStatusId === l.id}
                      className="btn-ghost px-2.5 py-1 text-xs"
                      onClick={() => handleStatus(l.id, "cancelled")}
                    >
                      Cancel
                    </button>
                  )}
                  <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => openEdit(l)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs text-status-action hover:bg-status-actionBg"
                    onClick={() => setConfirmingId(l.id)}
                    aria-label="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <StaffLeaveModal open={modalOpen} onClose={() => setModalOpen(false)} staffOptions={staffOptions} editing={editing} />
    </div>
  );
}
