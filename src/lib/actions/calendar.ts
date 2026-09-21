"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StaffLeaveType } from "@/lib/supabase/database.types";

const LEAVE_TYPES: StaffLeaveType[] = ["annual", "sick", "unpaid", "other"];

export type StaffLeaveResult = { success: true; id: string } | { success: false; error: string };

function revalidateCalendar() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createStaffLeave(formData: FormData): Promise<StaffLeaveResult> {
  const staffId = String(formData.get("staff_id") ?? "");
  const leaveType = String(formData.get("leave_type") ?? "") as StaffLeaveType;
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!staffId) return { success: false, error: "Choose which staff member this leave is for." };
  if (!LEAVE_TYPES.includes(leaveType)) return { success: false, error: "Choose a leave type." };
  if (!startDate || !endDate) return { success: false, error: "Enter both a start and end date." };
  if (endDate < startDate) return { success: false, error: "The end date can't be before the start date." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from("staff_leave")
    .insert({
      staff_id: staffId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      notes,
      created_by: user?.id ?? null,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !row) {
    return {
      success: false,
      error: `Could not save the leave: ${error?.message ?? "unknown error"}. If this mentions a missing table or column, migration 0037_centre_calendar.sql hasn't been run in Supabase yet.`,
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
    start_date?: string;
    end_date?: string;
    notes?: string | null;
  }
): Promise<StaffLeaveResult> {
  if (fields.start_date && fields.end_date && fields.end_date < fields.start_date) {
    return { success: false, error: "The end date can't be before the start date." };
  }

  const supabase = createClient();
  const { error } = await (supabase.from("staff_leave") as any).update(fields as any).eq("id", leaveId);
  if (error) {
    return { success: false, error: `Could not save the leave: ${error.message}` };
  }

  revalidateCalendar();
  return { success: true, id: leaveId };
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
