import Link from "next/link";
import { getRosterRooms, getRosterWeekByStartDate, listRosterWeeks } from "@/lib/data/roster";
import { getStaffList } from "@/lib/data/staff";
import { getWeekRoomRatioSummary, WEEKDAYS } from "@/lib/data/roster-ratios";
import { getRoomColorClasses } from "@/lib/constants";
import { mondayOf } from "@/lib/utils";
import { RosterGrid } from "@/components/roster/roster-grid";
import { RosterWeekNav } from "@/components/roster/roster-week-nav";

export const dynamic = "force-dynamic";

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

  const [rooms, staff, week, recentWeeks, ratioSummary] = await Promise.all([
    getRosterRooms(),
    getStaffList({ status: "active" }),
    getRosterWeekByStartDate(weekStartDate),
    listRosterWeeks(12),
    getWeekRoomRatioSummary(),
  ]);

  const hasWeekData = Boolean(week && week.shifts.length > 0);
  const priorWeekWithShifts = recentWeeks.find(
    (w) => w.week_start_date < weekStartDate && w.shift_count > 0
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Staff Roster</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Who&apos;s rostered where, Monday to Friday. Click a cell to set or change a shift.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/roster/board?week=${weekStartDate}`} className="btn-ghost">
            Room view →
          </Link>
          <Link href="/roster/ratios" className="btn-ghost">
            Room ratios →
          </Link>
        </div>
      </div>

      <RosterWeekNav
        weekStartDate={weekStartDate}
        hasWeekData={hasWeekData}
        duplicateFromWeekId={priorWeekWithShifts?.id ?? null}
        duplicateFromLabel={priorWeekWithShifts?.week_start_date ?? null}
      />

      <RosterGrid
        weekStartDate={weekStartDate}
        shifts={week?.shifts ?? []}
        staff={staff.map((s) => ({ id: s.id, full_name: s.full_name }))}
        rooms={rooms}
      />

      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-sand-100 px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-charcoal">Room Ratios — expected roll</h2>
            <p className="mt-0.5 text-xs text-charcoal/50">
              Built from each child&apos;s regular enrolled schedule, so it&apos;s the same every week — not specific
              to this one.
            </p>
          </div>
          <Link href="/roster/ratios" className="btn-ghost px-3 py-1.5 text-sm">
            Time-of-day breakdown →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/50">
                <th className="px-4 py-3 font-medium">Room</th>
                {WEEKDAYS.map((w) => (
                  <th key={w.key} className="px-3 py-3 font-medium">
                    {w.label.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {ratioSummary.rows.map((row) => {
                const colors = getRoomColorClasses(row.room?.color);
                return (
                  <tr key={row.room?.id ?? "unassigned"}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-charcoal">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${colors.chip}`} />
                        {row.room?.name ?? "No room assigned"}
                      </span>
                    </td>
                    {WEEKDAYS.map((w) => {
                      const cell = row.cells[w.key];
                      return (
                        <td key={w.key} className="px-3 py-2.5 text-charcoal/80">
                          {cell.enrolledTotal === 0 ? (
                            <span className="text-charcoal/30">—</span>
                          ) : (
                            <>
                              <span className="font-medium text-charcoal">{cell.enrolledTotal}</span>
                              <span className="ml-1 text-xs text-charcoal/50">
                                ({cell.enrolledUnder2}u / {cell.enrolledOver2}o)
                              </span>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-charcoal/10 bg-sand-50">
                <td className="px-4 py-2.5 font-medium text-charcoal">Min. staff needed (peak)</td>
                {WEEKDAYS.map((w) => (
                  <td key={w.key} className="px-3 py-2.5 font-medium text-charcoal">
                    {ratioSummary.centreRow[w.key].peakMinStaff}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="border-t border-charcoal/5 px-4 py-3 text-xs text-charcoal/40">
          &quot;Min. staff needed&quot; is the whole-centre floor at that day&apos;s tightest moment (Schedule 2, 1
          adult : 5 under 2, 1 adult : 10 aged 2 &amp; over) — compare it against who&apos;s actually rostered above.
          Under 2 / 2 &amp; over is estimated from each child&apos;s last recorded age, not an exact date of birth.
        </p>
      </section>
    </div>
  );
}
