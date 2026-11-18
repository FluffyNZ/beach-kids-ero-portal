import { getWeeklyFeesSummary } from "@/lib/data/fees";
import { getWeeklyHoursExtras } from "@/lib/data/weekly-hours";
import { getRosterRooms } from "@/lib/data/roster";
import { PageHeader } from "@/components/ui/page-header";
import { WeeklyHoursWorkspace, type HoursRow } from "@/components/attendance/weekly-hours-workspace";
import { addDays, mondayOfDateString, nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Attendance → Weekly hours: the weekly review-and-confirm workflow.
 *
 * - Booked sessions are each child's regular schedule (from their profile).
 * - Confirmed hours are what's been saved for this specific week
 *   (child_weekly_hours) — the only "actual attendance" Earlydesk records.
 *   There is no daily sign-in/out.
 * - Until a child's week is confirmed, Finance → Fees estimates their fee
 *   from booked hours (getWeeklyFeesSummary, unchanged).
 */
export default async function WeeklyHoursPage({
  searchParams,
}: {
  searchParams: { week?: string; room?: string; q?: string; show?: string };
}) {
  const today = nzTodayDateString();
  const valid = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) && !Number.isNaN(Date.parse(searchParams.week));
  const weekStartDate = mondayOfDateString(valid ? searchParams.week! : today);

  const [summary, extras, rooms] = await Promise.all([
    getWeeklyFeesSummary(weekStartDate),
    getWeeklyHoursExtras(weekStartDate),
    getRosterRooms(),
  ]);

  const roomOrder = new Map(rooms.map((r, i) => [r.id, i]));
  const rows: HoursRow[] = summary.children.map((c) => {
    const booking = extras.bookings.get(c.child_id);
    return {
      childId: c.child_id,
      name: c.full_name,
      roomId: booking?.roomId ?? null,
      roomName: c.room_name,
      roomColor: c.room_color,
      booked: booking?.booked ?? null,
      tbc: booking?.tbc ?? false,
      confirmed: c.is_estimated ? null : c.hours,
      feeTotal: c.fee_total,
      parentPays: c.parent_pays,
      specialRate: c.is_special_override,
    };
  });
  rows.sort(
    (a, b) =>
      (roomOrder.get(a.roomId ?? "") ?? 99) - (roomOrder.get(b.roomId ?? "") ?? 99) ||
      a.name.localeCompare(b.name, "en-NZ", { sensitivity: "base" })
  );

  const friday = addDays(weekStartDate, 4);
  const weekState = today < weekStartDate ? "future" : today < friday ? "in_progress" : "ready";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        title="Attendance"
        description="Review each child's hours for the week and confirm them. Booked sessions come from each child's regular schedule; only confirmed hours count as attendance."
      />
      <WeeklyHoursWorkspace
        weekStartDate={weekStartDate}
        today={today}
        weekState={weekState}
        rows={rows}
        rooms={rooms.filter((r) => rows.some((row) => row.roomId === r.id)).map((r) => ({ id: r.id, name: r.name, color: r.color }))}
        issuedInvoices={extras.issuedInvoices}
        initial={{
          room: searchParams.room ?? "",
          q: searchParams.q ?? "",
          needsReview: searchParams.show === "review",
        }}
      />
    </div>
  );
}
