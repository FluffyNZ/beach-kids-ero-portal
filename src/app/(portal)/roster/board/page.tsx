import Link from "next/link";
import { getRosterRooms, getRosterWeekByStartDate } from "@/lib/data/roster";
import { getStaffList } from "@/lib/data/staff";
import { getRoomColorClasses } from "@/lib/constants";
import { addDays, formatShortDate, formatTime, mondayOf } from "@/lib/utils";
import type { RosterShift } from "@/lib/types";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default async function RosterBoardPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  // Same "always snap to Monday" behaviour as the staff view, so a bad or
  // partial ?week= can't put the board out of step with its own header.
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : new Date();
  const weekStartDate = Number.isNaN(requested.getTime()) ? mondayOf(new Date()) : mondayOf(requested);
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStartDate, i));

  const [rooms, staff, week] = await Promise.all([
    getRosterRooms(),
    getStaffList({ status: "active" }),
    getRosterWeekByStartDate(weekStartDate),
  ]);

  const staffNameById = new Map(staff.map((s) => [s.id, s.full_name]));
  const shifts = week?.shifts ?? [];

  const roomSections = rooms.map((room) => {
    const roomShifts = shifts.filter((s) => s.room_id === room.id);

    const staffIds = Array.from(new Set(roomShifts.map((s) => s.staff_id))).sort((a, b) =>
      (staffNameById.get(a) ?? "").localeCompare(staffNameById.get(b) ?? "")
    );

    const rows = staffIds.map((staffId) => {
      const byDate = new Map<string, RosterShift>();
      roomShifts.filter((s) => s.staff_id === staffId).forEach((s) => byDate.set(s.shift_date, s));
      return { staffId, name: staffNameById.get(staffId) ?? "Unknown staff", byDate };
    });

    return { room, rows };
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Room Board</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Who&apos;s in each room, Monday to Friday — a read-only view for the wall or a tablet.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/roster?week=${weekStartDate}`} className="btn-ghost">
            ← Staff view
          </Link>
          <Link href="/roster/ratios" className="btn-ghost">
            Room ratios →
          </Link>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-1.5 px-4 py-3">
        <Link href={`/roster/board?week=${addDays(weekStartDate, -7)}`} className="btn-ghost px-2.5">
          ← Prev week
        </Link>
        <span className="px-2 font-display text-xl font-bold text-charcoal md:text-2xl">
          Week of {formatShortDate(weekStartDate)}
        </span>
        <Link href={`/roster/board?week=${addDays(weekStartDate, 7)}`} className="btn-ghost px-2.5">
          Next week →
        </Link>
        <Link href={`/roster/board?week=${mondayOf(new Date())}`} className="btn-ghost px-2.5 text-xs">
          This week
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {roomSections.map(({ room, rows }) => {
          const colors = getRoomColorClasses(room.color);
          return (
            <div key={room.id} className="card overflow-hidden p-0">
              <div className={`flex items-center gap-2 px-4 py-3 ${colors.bg}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${colors.chip}`} />
                <h2 className={`font-display text-lg font-semibold ${colors.text}`}>{room.name}</h2>
              </div>

              {rows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-charcoal/50">
                  No one rostered in {room.name} this week.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-base">
                    <thead>
                      <tr className="border-b border-charcoal/10 bg-sand-50">
                        <th className="px-4 py-3 text-left font-display text-sm font-bold uppercase tracking-wide text-charcoal/70 md:text-base">
                          Staff
                        </th>
                        {days.map((d, i) => (
                          <th
                            key={d}
                            className="px-3 py-3 text-left font-display text-sm font-bold uppercase tracking-wide text-charcoal/70 md:text-base"
                          >
                            {WEEKDAY_LABELS[i]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.staffId} className="border-b border-charcoal/5 last:border-0">
                          <td className="px-4 py-2.5 font-medium text-charcoal">{row.name}</td>
                          {days.map((d) => {
                            const shift = row.byDate.get(d);
                            return (
                              <td key={d} className="px-3 py-2.5 text-charcoal/80">
                                {shift ? `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
