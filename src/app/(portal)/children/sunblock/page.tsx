import { getSunblockChartRooms, isEnrolledInWeek } from "@/lib/data/sunblock-charts";
import type { SunblockPeriodType } from "@/components/children/sunblock-chart-controls";
import { MAX_MONTH_SPAN } from "@/lib/sunblock-format";
import { SunblockChartsWorkspace, type SunblockChartPage } from "@/components/children/sunblock-charts-view";
import type { SunblockDetailsChild } from "@/components/children/sunblock-details-drawer";
import { AutoPrint } from "@/components/attendance-roll/auto-print";
import { addDays, addMonths, mondayOfDateString, nzTodayDateString } from "@/lib/utils";
import { getNzPublicHolidaysInRange } from "@/lib/nz-public-holidays";

export const dynamic = "force-dynamic";

/** Every Mon–Fri week that overlaps `rangeStart`…`rangeEnd`, each once.
 * A week straddling two months is included for both ends of a range but,
 * because the range is walked as one continuous span, only ever once. */
function getWeekStartsOverlapping(rangeStart: string, rangeEnd: string): string[] {
  let monday = mondayOfDateString(rangeStart);
  // A range starting on a weekend doesn't overlap that week's Mon–Fri.
  if (addDays(monday, 4) < rangeStart) monday = addDays(monday, 7);
  const weeks: string[] = [];
  while (monday <= rangeEnd) {
    weeks.push(monday);
    monday = addDays(monday, 7);
  }
  return weeks;
}

function lastDayOfMonth(monthKey: string): string {
  return addDays(addMonths(`${monthKey}-01`, 1), -1);
}

function isValidMonthKey(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidDateString(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

const monthFmt = new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const printedFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const utc = (d: string) => new Date(`${d}T00:00:00Z`);

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
  const maxTo = addMonths(`${from}-01`, MAX_MONTH_SPAN - 1).slice(0, 7);
  const to = toRaw < from ? from : toRaw > maxTo ? maxTo : toRaw;

  // One query for every room's current children, bookings and sunblock
  // details; a single-room selection is filtered here in memory.
  const allRooms = await getSunblockChartRooms();
  const roomId = searchParams.room && allRooms.some((r) => r.id === searchParams.room) ? searchParams.room : "";
  const roomsToRender = roomId ? allRooms.filter((r) => r.id === roomId) : allRooms;

  let rangeStart: string;
  let rangeEnd: string;
  let periodLabel: string;
  if (period === "week") {
    rangeStart = week;
    rangeEnd = addDays(week, 4);
    periodLabel = "";
  } else if (period === "month") {
    rangeStart = `${month}-01`;
    rangeEnd = lastDayOfMonth(month);
    periodLabel = monthFmt.format(utc(rangeStart));
  } else {
    rangeStart = `${from}-01`;
    rangeEnd = lastDayOfMonth(to);
    periodLabel = from === to ? monthFmt.format(utc(rangeStart)) : `${monthFmt.format(utc(rangeStart))} to ${monthFmt.format(utc(`${to}-01`))}`;
  }

  const weekStarts = period === "week" ? [week] : getWeekStartsOverlapping(rangeStart, rangeEnd);
  const firstDay = weekStarts[0];
  const lastDay = addDays(weekStarts[weekStarts.length - 1], 4);

  // Public holidays across every printed weekday (including the edges of
  // weeks that spill outside the chosen months).
  const closedDays: Record<string, string> = {};
  for (const h of getNzPublicHolidaysInRange(firstDay, addDays(lastDay, 1))) closedDays[h.date] = h.name;

  // Week-major order (all rooms for week 1, then week 2…), each room-week once.
  const pages: SunblockChartPage[] = [];
  const seen = new Set<string>();
  for (const weekStartDate of weekStarts) {
    for (const room of roomsToRender) {
      const key = `${room.id}-${weekStartDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pages.push({
        key,
        room: { id: room.id, name: room.name, color: room.color },
        weekStartDate,
        children: room.children.filter((c) => isEnrolledInWeek(c, weekStartDate)),
        closedDays: Object.fromEntries(
          [0, 1, 2, 3, 4].map((i) => addDays(weekStartDate, i)).filter((d) => closedDays[d]).map((d) => [d, closedDays[d]])
        ),
      });
    }
  }

  const span = `${dayFmt.format(utc(firstDay))} – ${dayFmt.format(utc(lastDay))}`;
  const rangeLabel = periodLabel ? `${periodLabel} · weeks ${span}` : span;

  const detailsChildren: SunblockDetailsChild[] = allRooms.flatMap((room) =>
    room.children.map((c) => ({
      id: c.id,
      full_name: c.full_name,
      roomId: room.id,
      roomName: room.name,
      roomColor: room.color,
      uses_own_sunblock: c.uses_own_sunblock,
      sunblock_instructions: c.sunblock_instructions,
    }))
  );

  return (
    <>
      {searchParams.autoprint === "1" && <AutoPrint />}
      <SunblockChartsWorkspace
        pages={pages}
        printedOn={printedFmt.format(utc(today))}
        rangeLabel={rangeLabel}
        detailsChildren={detailsChildren}
        controls={{
          period,
          week,
          month,
          from,
          to,
          roomId,
          rooms: allRooms.map((r) => ({ id: r.id, name: r.name })),
        }}
      />
    </>
  );
}
