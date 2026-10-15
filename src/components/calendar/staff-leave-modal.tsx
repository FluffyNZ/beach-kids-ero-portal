"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createStaffLeave, updateStaffLeave } from "@/lib/actions/calendar";
import { STAFF_LEAVE_TYPES, STAFF_LEAVE_TYPE_LABEL, STAFF_LEAVE_STATUSES, STAFF_LEAVE_STATUS_LABEL } from "@/lib/constants";
import type { StaffLeave } from "@/lib/types";
import type { StaffLeaveType, StaffLeaveStatus } from "@/lib/supabase/database.types";

/** Add/edit modal for a single booked block of staff leave. Editing an
 * existing block just calls updateStaffLeave with the whole form instead of
 * createStaffLeave — same fields either way.
 *
 * Phase 2: a status (new leave defaults to Approved, matching the
 * one-step flow Ethan already uses — pick Requested instead when it
 * genuinely needs approving first), two more leave types (Unavailable,
 * Day off), an optional partial-day start/end time (only offered when the
 * start and end date are the same day), and a second "Private notes" field
 * kept out of the Calendar/Home/print views. */
export function StaffLeaveModal({
  open,
  onClose,
  staffOptions,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  staffOptions: Array<{ id: string; full_name: string }>;
  editing: StaffLeave | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(editing?.start_date ?? "");
  const [endDate, setEndDate] = useState(editing?.end_date ?? "");
  const [usePartialTime, setUsePartialTime] = useState(Boolean(editing?.start_time && editing?.end_time));

  // This component stays mounted the whole time (Modal just returns null
  // while closed), so the useState initializers above only run once —
  // without this, switching from editing one person's leave to another's
  // (or to "Add new") would keep showing the previous block's dates.
  useEffect(() => {
    if (!open) return;
    setStartDate(editing?.start_date ?? "");
    setEndDate(editing?.end_date ?? "");
    setUsePartialTime(Boolean(editing?.start_time && editing?.end_time));
  }, [open, editing]);

  const singleDay = Boolean(startDate) && startDate === endDate;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (!singleDay || !usePartialTime) {
      formData.set("start_time", "");
      formData.set("end_time", "");
    }

    startTransition(async () => {
      const result = editing
        ? await updateStaffLeave(editing.id, {
            staff_id: String(formData.get("staff_id") ?? ""),
            leave_type: String(formData.get("leave_type") ?? "") as StaffLeaveType,
            status: String(formData.get("status") ?? "") as StaffLeaveStatus,
            start_date: String(formData.get("start_date") ?? ""),
            end_date: String(formData.get("end_date") ?? ""),
            start_time: String(formData.get("start_time") ?? "").trim() || null,
            end_time: String(formData.get("end_time") ?? "").trim() || null,
            notes: String(formData.get("notes") ?? "").trim() || null,
            private_notes: String(formData.get("private_notes") ?? "").trim() || null,
          })
        : await createStaffLeave(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit staff leave" : "Add staff leave"}>
      <form key={editing?.id ?? "new"} ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="staff_id">
            Staff member
          </label>
          <select
            id="staff_id"
            name="staff_id"
            required
            defaultValue={editing?.staff_id ?? ""}
            className="input"
          >
            <option value="" disabled>
              Select staff member
            </option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="leave_type">
              Type
            </label>
            <select id="leave_type" name="leave_type" defaultValue={editing?.leave_type ?? "annual"} className="input">
              {STAFF_LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {STAFF_LEAVE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={editing?.status ?? "approved"} className="input">
              {STAFF_LEAVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STAFF_LEAVE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start_date">
              Start date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="end_date">
              End date
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {singleDay && (
          <div>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={usePartialTime}
                onChange={(e) => setUsePartialTime(e.target.checked)}
                className="h-4 w-4 rounded border-charcoal/30"
              />
              Partial day — only part of this day
            </label>
            {usePartialTime && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="start_time">
                    From
                  </label>
                  <input
                    id="start_time"
                    name="start_time"
                    type="time"
                    required={usePartialTime}
                    defaultValue={editing?.start_time?.slice(0, 5) ?? ""}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="end_time">
                    To
                  </label>
                  <input
                    id="end_time"
                    name="end_time"
                    type="time"
                    required={usePartialTime}
                    defaultValue={editing?.end_time?.slice(0, 5) ?? ""}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={editing?.notes ?? ""}
            className="input"
            placeholder="Optional — shown on Calendar and Roster"
          />
        </div>

        <div>
          <label className="label" htmlFor="private_notes">
            Private notes
          </label>
          <textarea
            id="private_notes"
            name="private_notes"
            rows={2}
            defaultValue={editing?.private_notes ?? ""}
            className="input"
            placeholder="Optional — only shown here, not on Calendar, Home, or the Roster print-out"
          />
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : editing ? "Save changes" : "Add leave"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
