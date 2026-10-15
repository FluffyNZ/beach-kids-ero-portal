import Link from "next/link";
import { getRosterRooms, getRosterWeekByStartDate } from "@/lib/data/roster";
import { getWeekRoomRatioSummary, WEEKDAYS } from "@/lib/data/roster-ratios";
import { getRoomColorClasses } from "@/lib/constants";
import { addDays, mondayOf, formatShortDate } from "@/lib/utils";
import { RosterNav } from "@/components/roster/roster-nav";

export const dynamic = "force-dynamic";

/** Phase 1 first pass only: compares how many distinct staff are actually
 * rostered in a room on a day against that day's peak minimum-staff figure
 * (same Schedule 2 ratio calculation already used on Room Ratios) — a
 * same-day headcount check, not the brief's full coverage model. It does
 * NOT yet account for arrival/departure times within the day, breaks,
 * leave, non-contact time, or the Ohinemuri→Pukewa afternoon transition —
 * those all need the schema from later phases (see the Roster redesign
 * report) and are deliberately not estimated here, so a "no gap" result
 * means only "enough people were rostered that day", not "covered at every
 * moment of the day". */
export default async function RosterCoveragePage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : new Date();
  const weekStartDate = Number.isNaN(requested.getTime()) ? mondayOf(new Date()) : mondayOf(requested);

  const [rooms, week, ratioSummary] = await Promise.all([
    getRosterRooms(),
    getRosterWeekByStartDate(weekStartDate),
    getWeekRoomRatioSummary(),
  ]);

  const hasWeekData = Boolean(week && week.shifts.length > 0);
  const ratioByRoomId = new Map(ratioSummary.rows.filter((r) => r.room).map((r) => [r.room!.id, r]));

  const rosteredCount = (roomId: string, weekday: (typeof WEEKDAYS)[number]["key"]) => {
    if (!week) return 0;
    const date = addDays(weekStartDate, WEEKDAYS.findIndex((w) => w.key === weekday));
    const staffIds = new Set(
      week.shifts.filter((s) => s.room_id === roomId && s.shift_date === date).map((s) => s.staff_id)
    );
    return staffIds.size;
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">Roster</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Rostered headcount against the day&apos;s peak ratio requirement — a first pass (see note below).
        </p>
      </div>

      <RosterNav weekStartDate={weekStartDate} />

      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Link href={`/roster/coverage?week=${addDays(weekStartDate, -7)}`} className="btn-ghost px-2.5">
            ← Prev week
          </Link>
          <span className="px-2 text-sm font-semibold text-charcoal">
            {formatShortDate(weekStartDate)} – {formatShortDate(addDays(weekStartDate, 4))}
          </span>
          <Link href={`/roster/coverage?week=${addDays(weekStartDate, 7)}`} className="btn-ghost px-2.5">
            Next week →
          </Link>
        </div>
      </div>

      {!hasWeekData ? (
        <div className="card p-6 text-sm text-charcoal/60">
          No shifts entered for this week yet, so there&apos;s nothing to check coverage against — this is deliberately
          left blank rather than showing every room as uncovered.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left text-sm">
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
              {rooms.map((room) => {
                const colors = getRoomColorClasses(room.color);
                const ratioRow = ratioByRoomId.get(room.id);
                return (
                  <tr key={room.id}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-charcoal">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${colors.chip}`} />
                        {room.name}
                      </span>
                    </td>
                    {WEEKDAYS.map((w) => {
                      const required = ratioRow?.cells[w.key].peakMinStaff ?? 0;
                      const rostered = rosteredCount(room.id, w.key);
                      const gap = required - rostered;
                      return (
                        <td key={w.key} className="px-3 py-2.5">
                          {required === 0 ? (
                            <span className="text-charcoal/30">—</span>
                          ) : gap > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-status-actionBg px-2 py-0.5 text-xs font-medium text-status-action">
                              Cover needed ({rostered}/{required})
                            </span>
                          ) : (
                            <span className="text-charcoal/70">
                              {rostered}/{required}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="card p-4 text-xs text-charcoal/50">
        &quot;Required&quot; is each day&apos;s peak minimum-staff figure from Room Ratios (Schedule 2, same as
        elsewhere in the app) — it doesn&apos;t yet account for arrival/departure times within the day, breaks, leave,
        non-contact time, or room transitions like Ohinemuri&apos;s afternoon move. A later phase will tighten this
        into the brief&apos;s full time-of-day coverage check.
      </p>
    </div>
  );
}
