"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** If this week has already been approved, editing a shift in it shouldn't
 * silently stay "Approved" as if nothing changed — flag it so whoever
 * approved it (or anyone else) can see it needs a fresh look. Approving the
 * week again (see approveRosterWeek) clears the flag. A draft week is
 * untouched by this — only an approved week can need review. */
async function markWeekTouchedIfApproved(weekId: string) {
  const supabase = createClient();
  const { data: week } = await supabase.from("roster_weeks").select("status").eq("id", weekId).maybeSingle();
  if (week?.status === "approved") {
    await (supabase.from("roster_weeks") as any)
      .update({ needs_review: true, last_modified_at: new Date().toISOString() })
      .eq("id", weekId);
  }
}

/** Gets the roster_weeks row for this Monday, creating an empty one the
 * first time it's needed (e.g. the first shift ever saved for that week).
 * Viewing an empty week never creates a row — only saving a shift does. */
export async function ensureRosterWeek(weekStartDate: string): Promise<{ weekId: string }> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("roster_weeks")
    .select("id")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (existing) return { weekId: existing.id };

  const userId = await currentUserId();
  const { data: created, error } = await supabase
    .from("roster_weeks")
    .insert({ week_start_date: weekStartDate, created_by: userId } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(`Could not create the roster week: ${error?.message ?? "unknown error"}`);
  }
  return { weekId: created.id };
}

export type SaveShiftInput = {
  weekStartDate: string;
  staffId: string;
  shiftDate: string;
  roomId: string | null;
  startTime: string;
  endTime: string;
  notes?: string | null;
};

/** Creates or updates the one shift for this staff member on this day —
 * the roster week is created automatically if this is its first shift. */
export async function saveRosterShift(input: SaveShiftInput) {
  const { weekId } = await ensureRosterWeek(input.weekStartDate);

  const supabase = createClient();
  const { error } = await (supabase.from("roster_shifts") as any).upsert(
    {
      week_id: weekId,
      staff_id: input.staffId,
      shift_date: input.shiftDate,
      room_id: input.roomId,
      start_time: input.startTime,
      end_time: input.endTime,
      notes: input.notes ?? null,
    } as any,
    { onConflict: "week_id,staff_id,shift_date" }
  );

  if (error) {
    throw new Error(`Could not save the shift: ${error.message}`);
  }
  await markWeekTouchedIfApproved(weekId);
  revalidatePath("/roster");
}

export async function deleteRosterShift(shiftId: string) {
  const supabase = createClient();
  const { data: shift } = await supabase.from("roster_shifts").select("week_id").eq("id", shiftId).maybeSingle();
  const { error } = await supabase.from("roster_shifts").delete().eq("id", shiftId);
  if (error) {
    throw new Error(`Could not remove the shift: ${error.message}`);
  }
  if (shift?.week_id) await markWeekTouchedIfApproved(shift.week_id);
  revalidatePath("/roster");
}

export type DuplicateWeekResult = { weekId: string; weekStartDate: string };

/** Copies every shift from `sourceWeekId` into the week starting on
 * `targetWeekStartDate`, shifting each shift's date by the same number of
 * days the week itself moved. A day/person that already has a shift in the
 * target week is overwritten with the copied one. */
export async function duplicateRosterWeek(
  sourceWeekId: string,
  targetWeekStartDate: string
): Promise<DuplicateWeekResult> {
  const supabase = createClient();

  const { data: sourceWeek } = await supabase
    .from("roster_weeks")
    .select("id, week_start_date")
    .eq("id", sourceWeekId)
    .maybeSingle();

  if (!sourceWeek) {
    throw new Error("That week no longer exists.");
  }

  const { data: sourceShifts } = await supabase
    .from("roster_shifts")
    .select("staff_id, room_id, shift_date, start_time, end_time, notes")
    .eq("week_id", sourceWeekId);

  const { weekId: targetWeekId } = await ensureRosterWeek(targetWeekStartDate);

  const sourceMondayMs = new Date(`${sourceWeek.week_start_date}T00:00:00Z`).getTime();
  const targetMondayMs = new Date(`${targetWeekStartDate}T00:00:00Z`).getTime();
  const offsetMs = targetMondayMs - sourceMondayMs;

  for (const shift of sourceShifts ?? []) {
    const newDate = new Date(new Date(`${shift.shift_date}T00:00:00Z`).getTime() + offsetMs)
      .toISOString()
      .slice(0, 10);

    await (supabase.from("roster_shifts") as any).upsert(
      {
        week_id: targetWeekId,
        staff_id: shift.staff_id,
        shift_date: newDate,
        room_id: shift.room_id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        notes: shift.notes,
      } as any,
      { onConflict: "week_id,staff_id,shift_date" }
    );
  }

  await markWeekTouchedIfApproved(targetWeekId);
  revalidatePath("/roster");
  return { weekId: targetWeekId, weekStartDate: targetWeekStartDate };
}

// ---------------------------------------------------------------------------
// Draft / Approved status (see migration 0059). "Approve" just records who
// and when and clears any review flag — it doesn't lock the week from
// further edits (the brief asks for changes after approval to be tracked
// and flagged for review, not blocked).
// ---------------------------------------------------------------------------

export type RosterWeekStatusResult = { success: true } | { success: false; error: string };

export async function approveRosterWeek(weekId: string): Promise<RosterWeekStatusResult> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await (supabase.from("roster_weeks") as any)
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      needs_review: false,
    })
    .eq("id", weekId);

  if (error) return { success: false, error: `Could not approve the roster: ${error.message}` };
  revalidatePath("/roster");
  return { success: true };
}

/** Lets a mistaken approval be undone, or a week be reopened for a bigger
 * rework than a quick edit — distinct from needs_review, which is the app
 * flagging an already-approved week as touched rather than someone
 * deliberately reopening it. */
export async function revertRosterWeekToDraft(weekId: string): Promise<RosterWeekStatusResult> {
  const supabase = createClient();
  const { error } = await (supabase.from("roster_weeks") as any)
    .update({ status: "draft", approved_by: null, approved_at: null, needs_review: false })
    .eq("id", weekId);

  if (error) return { success: false, error: `Could not revert the roster to draft: ${error.message}` };
  revalidatePath("/roster");
  return { success: true };
}
