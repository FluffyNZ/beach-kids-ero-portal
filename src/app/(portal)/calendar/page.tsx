import { getCalendarMonth, getStaffLeaveForRange } from "@/lib/data/calendar";
import { getStaffList } from "@/lib/data/staff";
import { currentMonthKey, monthLabel } from "@/lib/data/learning-stories";
import { addMonths } from "@/lib/utils";
import { MonthNav } from "@/components/learning-stories/month-nav";
import { CalendarMonthGrid, CalendarLegend, CalendarEventList } from "@/components/calendar/calendar-month-grid";
import { StaffLeaveManager } from "@/components/calendar/staff-leave-manager";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const monthKey = searchParams.month || currentMonthKey();
  const monthStart = `${monthKey}-01`;
  const monthEnd = addMonths(monthStart, 1);
  const today = new Date().toISOString().slice(0, 10);

  const [weeks, leave, staff] = await Promise.all([
    getCalendarMonth(monthKey),
    getStaffLeaveForRange(monthStart, monthEnd),
    getStaffList({ status: "active" }),
  ]);

  const staffOptions = staff.map((s) => ({ id: s.id, full_name: s.full_name }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Centre Calendar</h1>
        <p className="mt-0.5 text-sm text-charcoal/60">
          NZ public holidays (Auckland region), booked staff leave, and staff &amp; child birthdays.
        </p>
      </div>

      <MonthNav monthKey={monthKey} monthLabel={monthLabel(monthKey)} basePath="/calendar" />

      <CalendarLegend />

      <CalendarMonthGrid weeks={weeks} today={today} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold text-charcoal">This month</h2>
        <CalendarEventList weeks={weeks} />
      </section>

      <StaffLeaveManager leave={leave} staffOptions={staffOptions} />

      <p className="text-xs text-charcoal/40">
        Birthdays only show up once a date of birth is on file — add one from a staff or child&apos;s profile page.
        Matariki dates are confirmed through 2030; if you&apos;re looking further ahead than that, check the date
        against MBIE&apos;s official notice before relying on it.
      </p>
    </div>
  );
}
