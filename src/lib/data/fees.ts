import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChildrenList } from "@/lib/data/children";
import { calculateChildWeeklyFee, scheduleToWeekdayHours } from "@/lib/fees";
import { isEceEligible } from "@/lib/constants";
import type { ChildEnrolledSchedule, FeeSettings, WeeklyFeesSummary } from "@/lib/types";

/** The one fee_settings row — seeded with the real numbers from the
 * uploaded fees report (Assumptions tab), editable from Settings. Falls
 * back to those same defaults if the row is somehow missing so the fee
 * calculator never throws over a missing settings row. */
export async function getFeeSettings(): Promise<FeeSettings> {
  const supabase = createClient();
  const { data } = await supabase.from("fee_settings").select("*").eq("id", true).maybeSingle();

  return {
    standard_hourly_rate: data?.standard_hourly_rate ?? 7.5,
    sibling_discount_percent: data?.sibling_discount_percent ?? 0.1,
    ece_daily_max_hours: data?.ece_daily_max_hours ?? 6,
    ece_weekly_max_hours: data?.ece_weekly_max_hours ?? 20,
    updated_at: data?.updated_at ?? new Date(0).toISOString(),
  };
}

/** Every active child's fees for the week starting `weekStartDate` (a
 * Monday). A child with an actual child_weekly_hours row for this week
 * uses those real hours; anyone else falls back to their enrolled
 * schedule (their usual booked days/times) so the totals reflect a
 * sensible estimate of what's owed even before this week's attendance has
 * been confirmed — each such child is flagged `is_estimated`.
 * `hasAnyHoursEntered` tells the page whether ANY child has confirmed
 * actual hours for this week yet. */
export async function getWeeklyFeesSummary(weekStartDate: string): Promise<WeeklyFeesSummary> {
  const supabase = createClient();

  const [children, settings, { data: week }] = await Promise.all([
    getChildrenList({ status: "active" }),
    getFeeSettings(),
    supabase.from("fee_weeks").select("id").eq("week_start_date", weekStartDate).maybeSingle(),
  ]);

  const hoursByChildId = new Map<
    string,
    { mon_hours: number; tue_hours: number; wed_hours: number; thu_hours: number; fri_hours: number }
  >();

  if (week) {
    const { data: hoursRows } = await supabase
      .from("child_weekly_hours")
      .select("child_id, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours")
      .eq("week_id", week.id);

    (hoursRows ?? []).forEach((row) => {
      hoursByChildId.set(row.child_id, {
        mon_hours: row.mon_hours,
        tue_hours: row.tue_hours,
        wed_hours: row.wed_hours,
        thu_hours: row.thu_hours,
        fri_hours: row.fri_hours,
      });
    });
  }

  const scheduleByChildId = new Map<string, ChildEnrolledSchedule>();
  const { data: scheduleRows } = await supabase
    .from("child_enrolled_schedule")
    .select("child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end, updated_at")
    .in(
      "child_id",
      children.map((c) => c.id)
    );
  (scheduleRows ?? []).forEach((row) => {
    scheduleByChildId.set(row.child_id, row);
  });

  const zeroWeek = { mon_hours: 0, tue_hours: 0, wed_hours: 0, thu_hours: 0, fri_hours: 0 };

  const fees = children.map((child) => {
    const actualHours = hoursByChildId.get(child.id);
    const schedule = scheduleByChildId.get(child.id);
    const hours = actualHours ?? (schedule ? scheduleToWeekdayHours(schedule) : zeroWeek);

    return calculateChildWeeklyFee({
      childId: child.id,
      fullName: child.full_name,
      roomName: child.room_name,
      roomColor: child.room_color,
      hours,
      hourlyRateOverride: child.hourly_rate,
      // Derived from age rather than the stored column, so this is correct
      // immediately even before a DB sync migration has run.
      twentyHoursEce: isEceEligible(child.age_years),
      siblingDiscountEligible: child.sibling_discount_eligible,
      specialWeeklyOverride: child.special_weekly_override,
      // WINZ weekly payment isn't loaded in the list query — only whether
      // one exists — so it's fetched separately below.
      winzWeeklyPayment: null,
      settings,
      isEstimated: !actualHours,
    });
  });

  // Fill in the real WINZ weekly payment for anyone who has a subsidy —
  // done as one batched query rather than per-child, same reasoning as the
  // photo-signing batch in getChildrenList.
  const winzChildIds = children.filter((c) => c.has_winz_subsidy).map((c) => c.id);
  if (winzChildIds.length > 0) {
    const { data: winzRows } = await supabase
      .from("child_winz_subsidies")
      .select("child_id, weekly_payment")
      .in("child_id", winzChildIds);

    const winzByChildId = new Map((winzRows ?? []).map((w) => [w.child_id, w.weekly_payment]));
    fees.forEach((fee) => {
      const payment = winzByChildId.get(fee.child_id);
      if (payment) {
        fee.winz_payment = payment;
        fee.parent_pays = Math.max(0, fee.fee_total - payment);
      }
    });
  }

  const hasAnyHoursEntered = hoursByChildId.size > 0;

  return {
    weekStartDate,
    hasAnyHoursEntered,
    children: fees,
    totalFees: fees.reduce((sum, f) => sum + f.fee_total, 0),
    totalWinz: fees.reduce((sum, f) => sum + f.winz_payment, 0),
    totalParentPays: fees.reduce((sum, f) => sum + f.parent_pays, 0),
  };
}
