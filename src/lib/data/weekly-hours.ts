import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChildrenList } from "@/lib/data/children";
import { scheduleToWeekdayHours } from "@/lib/fees";
import type { ChildEnrolledSchedule, WeekdayHours } from "@/lib/types";

// Read-only extras for the Weekly Hours (Attendance) page that the fee
// summary doesn't carry: each active child's room, their *booked* hours
// from their regular schedule (kept separate from any confirmed hours),
// whether that schedule is marked TBC, and how many invoices have already
// been issued for the week. Nothing here is written or recalculated —
// fees still come from getWeeklyFeesSummary unchanged.

export type ChildBooking = {
  roomId: string | null;
  /** null when no booked schedule is on file at all. */
  booked: WeekdayHours | null;
  tbc: boolean;
};

export type WeeklyHoursExtras = {
  bookings: Map<string, ChildBooking>;
  /** Invoices for this week already sent or paid (drafts and voided ones aren't counted). */
  issuedInvoices: number;
};

export async function getWeeklyHoursExtras(weekStartDate: string): Promise<WeeklyHoursExtras> {
  const supabase = createClient();
  const children = await getChildrenList({ status: "active" });
  const ids = children.map((c) => c.id);

  const [{ data: schedules }, { data: invoices }] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("child_enrolled_schedule")
          .select("child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end, tbc, updated_at")
          .in("child_id", ids)
      : Promise.resolve({ data: [] as (ChildEnrolledSchedule & { child_id: string })[] }),
    supabase.from("invoices").select("id, status").eq("week_start_date", weekStartDate),
  ]);

  const scheduleById = new Map((schedules ?? []).map((s) => [(s as { child_id: string }).child_id, s as ChildEnrolledSchedule & { child_id: string }]));
  const bookings = new Map<string, ChildBooking>();
  children.forEach((c) => {
    const s = scheduleById.get(c.id);
    bookings.set(c.id, {
      roomId: c.room_id,
      booked: s ? scheduleToWeekdayHours(s) : null,
      tbc: s?.tbc ?? false,
    });
  });

  return {
    bookings,
    issuedInvoices: (invoices ?? []).filter((i) => ["sent", "paid"].includes((i as { status: string }).status)).length,
  };
}
