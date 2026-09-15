"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WeekdayHours } from "@/lib/types";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Gets the fee_weeks row for this Monday, creating an empty one the first
 * time it's needed — mirrors ensureRosterWeek. Viewing an empty week never
 * creates a row, only saving hours does. */
export async function ensureFeeWeek(weekStartDate: string): Promise<{ weekId: string }> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("fee_weeks")
    .select("id")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (existing) return { weekId: existing.id };

  const userId = await currentUserId();
  const { data: created, error } = await supabase
    .from("fee_weeks")
    .insert({ week_start_date: weekStartDate, created_by: userId } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(`Could not create the fee week: ${error?.message ?? "unknown error"}`);
  }
  return { weekId: created.id };
}

export type SaveWeeklyHoursInput = {
  weekStartDate: string;
  entries: Array<{ childId: string; hours: WeekdayHours }>;
};

/** Bulk-saves every child's Mon–Fri hours for a week in one go — the hours
 * entry page holds all of a week's edits in local state and saves them
 * together rather than one request per child. A child with every day at
 * zero is still upserted (so clearing hours back to zero is saved, not
 * silently skipped). */
export async function saveWeeklyHours(input: SaveWeeklyHoursInput) {
  if (input.entries.length === 0) return;

  const { weekId } = await ensureFeeWeek(input.weekStartDate);
  const supabase = createClient();

  const rows = input.entries.map((entry) => ({
    week_id: weekId,
    child_id: entry.childId,
    mon_hours: entry.hours.mon_hours,
    tue_hours: entry.hours.tue_hours,
    wed_hours: entry.hours.wed_hours,
    thu_hours: entry.hours.thu_hours,
    fri_hours: entry.hours.fri_hours,
  }));

  const { error } = await supabase
    .from("child_weekly_hours")
    .upsert(rows as any, { onConflict: "week_id,child_id" });

  if (error) {
    throw new Error(`Could not save this week's hours: ${error.message}`);
  }

  revalidatePath("/children");
  revalidatePath("/children/hours");
}

export type UpdateFeeSettingsInput = {
  standard_hourly_rate: number;
  sibling_discount_percent: number;
  ece_daily_max_hours: number;
  ece_weekly_max_hours: number;
};

/** Updates the single centre-wide fee_settings row (rate, sibling discount
 * %, 20 Hours ECE caps) — everything downstream reads it live, so this is
 * the only place these numbers need to change. */
export async function updateFeeSettings(input: UpdateFeeSettingsInput) {
  const supabase = createClient();
  const userId = await currentUserId();

  const { error } = await supabase
    .from("fee_settings")
    .update({
      standard_hourly_rate: input.standard_hourly_rate,
      sibling_discount_percent: input.sibling_discount_percent,
      ece_daily_max_hours: input.ece_daily_max_hours,
      ece_weekly_max_hours: input.ece_weekly_max_hours,
      updated_by: userId,
    } as any)
    .eq("id", true);

  if (error) {
    throw new Error(`Could not save fee settings: ${error.message}`);
  }

  revalidatePath("/settings");
  revalidatePath("/children");
  revalidatePath("/children/hours");
}
