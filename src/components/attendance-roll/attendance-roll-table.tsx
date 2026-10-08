import { formatTime, formatShortDate, addDays } from "@/lib/utils";
import { getRoomColorClasses } from "@/lib/constants";
import { ATTENDANCE_WEEKDAYS, type AttendanceRollRoom } from "@/lib/data/attendance-roll";

function cellLabel(day: { start: string | null; end: string | null }): string {
  if (!day.start || !day.end) return "–";
  return `${formatTime(day.start)}–${formatTime(day.end)}`;
}

/** `weekStartDate` labels this room's page with the Monday it's for, and
 * shows each weekday's actual date alongside "Mon"/"Tue"/etc. `pageBreakAfter`
 * puts a hard page break after this room when printing, so the printed roll
 * comes out one room to an A4 page — the last room in the list should leave
 * this off so printing doesn't end on a trailing blank page. */
export function AttendanceRollTable({
  room,
  weekStartDate,
  pageBreakAfter = false,
}: {
  room: AttendanceRollRoom;
  weekStartDate: string;
  pageBreakAfter?: boolean;
}) {
  const colors = getRoomColorClasses(room.color);

  return (
    <section className={`card break-inside-avoid overflow-hidden p-0 ${pageBreakAfter ? "print:break-after-page" : ""}`}>
      <div className={`flex flex-wrap items-center gap-2 px-4 py-3 ${colors.bg}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.chip}`} />
        <h2 className={`font-display text-lg font-semibold ${colors.text}`}>{room.name}</h2>
        <span className={`text-xs font-medium ${colors.text} opacity-70`}>
          Week starting {formatShortDate(weekStartDate)}
        </span>
        <span className={`ml-auto text-xs font-medium ${colors.text}`}>
          {room.children.length} {room.children.length === 1 ? "child" : "children"} enrolled
        </span>
      </div>

      {room.children.length === 0 ? (
        <p className="px-4 py-6 text-sm text-charcoal/50">No children currently enrolled in {room.name}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/50">
                <th className="px-4 py-3 font-medium">Child</th>
                {ATTENDANCE_WEEKDAYS.map((d, i) => (
                  <th key={d.key} className="px-3 py-3 font-medium">
                    {d.label} <span className="font-normal normal-case text-charcoal/40">{formatShortDate(addDays(weekStartDate, i))}</span>
                  </th>
                ))}
                <th className="px-3 py-3 font-medium print:w-28">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {room.children.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium text-charcoal">{c.full_name}</td>
                  {ATTENDANCE_WEEKDAYS.map((d) => (
                    <td key={d.key} className="px-3 py-2.5 text-charcoal/80">
                      {cellLabel(c.days[d.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2.5" />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-charcoal/10 bg-sand-50 font-medium text-charcoal">
                <td className="px-4 py-2.5">Booked total</td>
                {ATTENDANCE_WEEKDAYS.map((d) => (
                  <td key={d.key} className="px-3 py-2.5">
                    {room.bookedTotals[d.key]}
                  </td>
                ))}
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
