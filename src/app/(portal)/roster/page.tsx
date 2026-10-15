import { getRosterRooms, getRosterWeekByStartDate, listRosterWeeks } from "@/lib/data/roster";
import { getStaffList } from "@/lib/data/staff";
import { getWeekRoomRatioSummary } from "@/lib/data/roster-ratios";
import { getStaffLeaveForRange } from "@/lib/data/calendar";
import { mondayOf, addDays } from "@/lib/utils";
import { RosterGrid } from "@/components/roster/roster-grid";
import { RosterWeekNav } from "@/components/roster/roster-week-nav";
import { RosterNav } from "@/components/roster/roster-nav";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { draft: "Draft", approved: "Approved" } as const;
const STATUS_CLASS = {
  draft: "bg-sand-200 text-charcoal/60",
  approved: "bg-lilac-100 text-lilac-700",
} as const;

export default async function RosterPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  // Always snap to the Monday of whatever date is requested (or today), so
  // a bad/partial query param can't put the grid out of step with its own
  // "Monday" header.
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : new Date();
  const weekStartDate = Number.isNaN(requested.getTime()) ? mondayOf(new Date()) : mondayOf(requested);

  const [rooms, staff, week, recentWeeks, ratioSummary, leave] = await Promise.all([
    getRosterRooms(),
    getStaffList({ status: "active" }),
    getRosterWeekByStartDate(weekStartDate),
    listRosterWeeks(12),
    getWeekRoomRatioSummary(),
    getStaffLeaveForRange(weekStartDate, addDays(weekStartDate, 5)),
  ]);

  const hasWeekData = Boolean(week && week.shifts.length > 0);
  const priorWeekWithShifts = recentWeeks.find(
    (w) => w.week_start_date < weekStartDate && w.shift_count > 0
  );
  const status = week?.status ?? "draft";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Scoped to this page only — doesn't touch the global stylesheet, so
          other print:hidden pages (Attendance Roll, Audit Pack) keep their
          own portrait default. The brief asks for landscape specifically
          for the Roster print/PDF. */}
      <style>{`@media print { @page { size: landscape; } }`}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">Roster</h1>
            {hasWeekData && (
              <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-charcoal/60">
            Who&apos;s rostered where, Monday to Friday. Click a cell to set or change a shift.
          </p>
        </div>
      </div>

      <RosterNav weekStartDate={weekStartDate} />

      <RosterWeekNav
        weekStartDate={weekStartDate}
        weekId={week?.id ?? null}
        hasWeekData={hasWeekData}
        status={week?.status ?? null}
        approvedByName={week?.approved_by_name ?? null}
        approvedAt={week?.approved_at ?? null}
        needsReview={week?.needs_review ?? false}
        lastModifiedAt={week?.last_modified_at ?? null}
        duplicateFromWeekId={priorWeekWithShifts?.id ?? null}
        duplicateFromLabel={priorWeekWithShifts?.week_start_date ?? null}
      />

      <RosterGrid
        weekStartDate={weekStartDate}
        shifts={week?.shifts ?? []}
        staff={staff.map((s) => ({ id: s.id, full_name: s.full_name, room_id: s.room_id, is_relief: s.is_relief }))}
        rooms={rooms}
        leave={leave}
        ratioRows={ratioSummary.rows}
      />
    </div>
  );
}
