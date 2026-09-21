"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createStaffLeave, updateStaffLeave } from "@/lib/actions/calendar";
import { STAFF_LEAVE_TYPES, STAFF_LEAVE_TYPE_LABEL } from "@/lib/constants";
import type { StaffLeave } from "@/lib/types";
import type { StaffLeaveType } from "@/lib/supabase/database.types";

/** Add/edit modal for a single booked block of staff leave. Editing an
 * existing block just calls updateStaffLeave with the whole form instead of
 * createStaffLeave — same fields either way. */
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = editing
        ? await updateStaffLeave(editing.id, {
            staff_id: String(formData.get("staff_id") ?? ""),
            leave_type: String(formData.get("leave_type") ?? "") as StaffLeaveType,
            start_date: String(formData.get("start_date") ?? ""),
            end_date: String(formData.get("end_date") ?? ""),
            notes: String(formData.get("notes") ?? "").trim() || null,
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

        <div>
          <label className="label" htmlFor="leave_type">
            Leave type
          </label>
          <select id="leave_type" name="leave_type" defaultValue={editing?.leave_type ?? "annual"} className="input">
            {STAFF_LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {STAFF_LEAVE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
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
              defaultValue={editing?.start_date ?? ""}
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
              defaultValue={editing?.end_date ?? ""}
              className="input"
            />
          </div>
        </div>

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
            placeholder="Optional"
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
