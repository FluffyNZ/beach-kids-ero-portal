import Link from "next/link";
import { getSunblockChartRooms, isEnrolledInWeek } from "@/lib/data/sunblock-charts";
import { SunblockChartControls, type SunblockPeriodType } from "@/components/children/sunblock-chart-controls";
import { SunblockChartsView, type SunblockChartPage } from "@/components/children/sunblock-charts-view";
import { AutoPrint } from "@/components/attendance-roll/auto-print";
import { PrintButton } from "@/components/audit-pack/print-button";
import { addDays, addMonths, mondayOfDateString, nzTodayDateString } from "@/lib/utils";
import { getNzPublicHolidaysInRange } from "@/lib/nz-public-holidays";

export const dynamic = "force-dynamic";

/** The first day of the Mon-Fri week whose Monday is >= `rangeStart`, up to
 * and including `rangeEnd` — i.e. every Monday that actually falls inside
 * the range, nothing either side of it. Walking one continuous range (a
 * single month, or the whole span of several months) rather than looping
 * month-by-month-then-concatenating is what makes "avoid duplicate weeks
 * across month boundaries" automatic: a week straddling two months has only
 * one Monday, so it's only ever generated once, and it's attributed to
 * whichever month that Monday falls in. */
function getWeekStartsInRange(rangeStart: string, rangeEnd: string): string[] {
  let monday = mondayOfDateString(rangeStart);
  if (monday < rangeStart) monday = addDays(monday, 7);
  const weeks: string[] = [];
  while (monday <= rangeEnd) {
    weeks.push(monday);
    monday = addDays(monday, 7);
  }
  return weeks;
}

/** Last day (as "YYYY-MM-DD") of the month that `monthKey` ("YYYY-MM")
 * falls in. */
function lastDayOfMonth(monthKey: string): string {
  return addDays(addMonths(`${monthKey}-01`, 1), -1);
}

function isValidMonthKey(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidDateString(value: string | undefined): value is string {
  if (!value) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export default async function SunblockChartsPage({
  searchParams,
}: {
  searchParams: { period?: string; week?: string; month?: string; from?: string; to?: string; room?: string; autoprint?: string };
}) {
  const today = nzTodayDateString();
  const period: SunblockPeriodType =
    searchParams.period === "month" || searchParams.period === "months" ? searchParams.period : "week";

  const week = isValidDateString(searchParams.week) ? mondayOfDateString(searchParams.week) : mondayOfDateString(today);
  const month = isValidMonthKey(searchParams.month) ? searchParams.month : today.slice(0, 7);
  const from = isValidMonthKey(searchParams.from) ? searchParams.from : today.slice(0, 7);
  const toRaw = isValidMonthKey(searchParams.to) ? searchParams.to : from;
  const to = toRaw < from ? from : toRaw;

  // One query for every room and every child's regular schedule/preference —
  // see the comment on getSunblockChartRooms for why this doesn't need to
  // vary per week. Filtering to a single selected room happens here, in
  // memory, rather than re-querying.
  const allRooms = await getSunblockChartRooms();
  const roomId = searchParams.room && allRooms.some((r) => r.id === searchParams.room) ? searchParams.room : "";
  const roomsToRender = roomId ? allRooms.filter((r) => r.id === roomId) : allRooms;
  const roomOptions = allRooms.map((r) => ({ id: r.id, name: r.name }));

  let rangeStart: string;
  let rangeEnd: string;
  if (period === "week") {
    rangeStart = week;
    rangeEnd = addDays(week, 4);
  } else if (period === "month") {
    rangeStart = `${month}-01`;
    rangeEnd = lastDayOfMonth(month);
  } else {
    rangeStart = `${from}-01`;
    rangeEnd = lastDayOfMonth(to);
  }

  const weekStarts = period === "week" ? [week] : getWeekStartsInRange(rangeStart, rangeEnd);

  // Centre closures — public holidays — across the full printed range, in
  // one call. No per-day attendance record exists in this app (only the
  // regular booked schedule), so this is the one real "the centre wasn't
  // open" signal available; see getSunblockChartRooms's own comment for the
  // other known gaps (no room-change history, no one-off extra-day tracking).
  const closedDays = new Set(
    getNzPublicHolidaysInRange(rangeStart, addDays(rangeEnd, 1)).map((h) => h.date)
  );

  const pages: SunblockChartPage[] = [];
  for (const weekStartDate of weekStarts) {
    for (const room of roomsToRender) {
      pages.push({
        key: `${room.id}-${weekStartDate}`,
        room: { id: room.id, name: room.name, color: room.color },
        weekStartDate,
        children: room.children.filter((c) => isEnrolledInWeek(c, weekStartDate)),
        closedDays,
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 print:max-w-none">
      {/* Scoped landscape print CSS, same pattern as the Roster page — each
          printed room-week sheet is A4 landscape, one per page (see the
          pageBreakAfter prop threaded through SunblockChartsView below). */}
      <style>{`@media print { @page { size: landscape; } }`}</style>

      {searchParams.autoprint === "1" && <AutoPrint />}

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Sunblock Charts</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            One printable weekly chart per room, built from each child&apos;s regular booked schedule — staff tick
            AM and PM by hand on paper. Booked days aren&apos;t attendance, so leave the tick boxes empty here;
            nothing on this page is saved as a completed application.
          </p>
        </div>
        <Link href="/children" className="btn-ghost">
          ← Children
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex-1">
          <SunblockChartControls period={period} week={week} month={month} from={from} to={to} roomId={roomId} rooms={roomOptions} />
        </div>
        <PrintButton />
      </div>

      {pages.length === 0 ? (
        <div className="card p-6 text-sm text-charcoal/60">
          No rooms to show for this selection.
        </div>
      ) : (
        <SunblockChartsView pages={pages} />
      )}

      <p className="text-xs text-charcoal/40 print:hidden">
        Booked days come from each child&apos;s regular weekly schedule on file, the same source the Weekly Booked
        Sessions roll uses — a one-off extra day or absence for a single week won&apos;t show here. A child&apos;s
        room reflects their current room assignment for every week printed, since the app doesn&apos;t keep a
        history of past room changes. Shaded days with a dash are days the child isn&apos;t booked in, or the
        centre is closed for a public holiday.
      </p>
    </div>
  );
}
