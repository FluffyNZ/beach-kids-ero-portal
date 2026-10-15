"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StaffLeaveType, StaffLeaveStatus } from "@/lib/supabase/database.types";

const LEAVE_TYPES: StaffLeaveType[] = ["annual", "sick", "unpaid", "other", "unavailable", "day_off"];
const LEAVE_STATUSES: StaffLeaveStatus[] = ["requested", "approved", "declined", "cancelled"];

export type StaffLeaveResult = { success: true; id: string } | { success: false; error: string };

// Leave now feeds the Roster pages too (Phase 2), not just the Calendar —
// so every write here revalidates both areas.
function revalidateCalendar() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/roster");
  revalidatePath("/roster/leave");
  revalidatePath("/roster/coverage");
}

type LeaveTimeFields = {
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
};

/** A partial day (start_time/end_time set) only makes sense within a single
 * day — enforced here to match the database check constraint, with a
 * friendlier error message than a raw constraint violation. */
function validateLeaveTimes(fields: LeaveTimeFields): string | null {
  const { start_date, end_date, start_time, end_time } = fields;
  if (!start_time && !end_time) return null;
  if (!start_time || !end_time) {
    return "Enter both a start and end time for a partial day, or leave both blank for a whole day.";
  }
  if (start_date !== end_date) {
    return "A partial day's start and end time only apply to a single day — use whole days for a multi-day block.";
  }
  if (end_time <= start_time) {
    return "The end time must be after the start time.";
  }
  return null;
}

function readLeaveFormFields(formData: FormData) {
  const staffId = String(formData.get("staff_id") ?? "");
  const leaveType = String(formData.get("leave_type") ?? "") as StaffLeaveType;
  const status = String(formData.get("status") ?? "approved") as StaffLeaveStatus;
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const startTime = String(formData.get("start_time") ?? "").trim() || null;
  const endTime = String(formData.get("end_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const privateNotes = String(formData.get("private_notes") ?? "").trim() || null;
  return { staffId, leaveType, status, startDate, endDate, startTime, endTime, notes, privateNotes };
}

export async function createStaffLeave(formData: FormData): Promise<StaffLeaveResult> {
  const { staffId, leaveType, status, startDate, endDate, startTime, endTime, notes, privateNotes } =
    readLeaveFormFields(formData);

  if (!staffId) return { success: false, error: "Choose which staff member this leave is for." };
  if (!LEAVE_TYPES.includes(leaveType)) return { success: false, error: "Choose a leave type." };
  if (!LEAVE_STATUSES.includes(status)) return { success: false, error: "Choose a status." };
  if (!startDate || !endDate) return { success: false, error: "Enter both a start and end date." };
  if (endDate < startDate) return { success: false, error: "The end date can't be before the start date." };

  const timeError = validateLeaveTimes({ start_date: startDate, end_date: endDate, start_time: startTime, end_time: endTime });
  if (timeError) return { success: false, error: timeError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A request that's already Approved or Declined on creation counts as
  // decided immediately (matches today's one-step behaviour by default,
  // since new leave defaults to Approved) — Requested/Cancelled leave has
  // no decision recorded yet.
  const isDecision = status === "approved" || status === "declined";

  const { data: row, error } = await supabase
    .from("staff_leave")
    .insert({
      staff_id: staffId,
      leave_type: leaveType,
      status,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      notes,
      private_notes: privateNotes,
      created_by: user?.id ?? null,
      decided_by: isDecision ? user?.id ?? null : null,
      decided_at: isDecision ? new Date().toISOString() : null,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !row) {
    return {
      success: false,
      error: `Could not save the leave: ${error?.message ?? "unknown error"}. If this mentions a missing column, migration 0060_staff_leave_status.sql hasn't been run in Supabase yet.`,
    };
  }

  revalidateCalendar();
  return { success: true, id: row.id };
}

export async function updateStaffLeave(
  leaveId: string,
  fields: {
    staff_id?: string;
    leave_type?: StaffLeaveType;
    status?: StaffLeaveStatus;
    start_date?: string;
    end_date?: string;
    start_time?: string | null;
    end_time?: string | null;
    notes?: string | null;
    private_notes?: string | null;
  }
): Promise<StaffLeaveResult> {
  if (fields.start_date && fields.end_date && fields.end_date < fields.start_date) {
    return { success: false, error: "The end date can't be before the start date." };
  }
  if (fields.start_date && fields.end_date) {
    const timeError = validateLeaveTimes({
      start_date: fields.start_date,
      end_date: fields.end_date,
      start_time: fields.start_time ?? null,
      end_time: fields.end_time ?? null,
    });
    if (timeError) return { success: false, error: timeError };
  }

  const supabase = createClient();
  const update: Record<string, unknown> = { ...fields };

  // Only stamp decided_by/decided_at when the status is actually changing
  // into Approved/Declined here — otherwise an unrelated edit (fixing a
  // typo in the notes) to an already-decided record would silently make it
  // look like it was just re-approved.
  if (fields.status) {
    const { data: existing } = await supabase.from("staff_leave").select("status").eq("id", leaveId).maybeSingle();
    const statusChanged = !existing || existing.status !== fields.status;
    if (statusChanged) {
      if (fields.status === "approved" || fields.status === "declined") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        update.decided_by = user?.id ?? null;
        update.decided_at = new Date().toISOString();
      } else {
        update.decided_by = null;
        update.decided_at = null;
      }
    }
  }

  const { error } = await (supabase.from("staff_leave") as any).update(update as any).eq("id", leaveId);
  if (error) {
    return { success: false, error: `Could not save the leave: ${error.message}` };
  }

  revalidateCalendar();
  return { success: true, id: leaveId };
}

/** Dedicated quick action for the Approve/Decline/Cancel/Reopen buttons in
 * the Staff leave list — same shape as updateStaffLeave's status handling,
 * exposed on its own so the UI doesn't need to resend the whole record just
 * to change its status. */
export async function setStaffLeaveStatus(leaveId: string, status: StaffLeaveStatus): Promise<StaffLeaveResult> {
  return updateStaffLeave(leaveId, { status });
}

export type DeleteStaffLeaveResult = { success: true } | { success: false; error: string };

export async function deleteStaffLeave(leaveId: string): Promise<DeleteStaffLeaveResult> {
  const supabase = createClient();
  const { error } = await supabase.from("staff_leave").delete().eq("id", leaveId);
  if (error) {
    return { success: false, error: `Could not remove the leave: ${error.message}` };
  }

  revalidateCalendar();
  return { success: true };
}
