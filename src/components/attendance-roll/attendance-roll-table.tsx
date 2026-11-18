import { formatTime, addDays } from "@/lib/utils";
import { getRoomColorClasses } from "@/lib/constants";
import { ATTENDANCE_WEEKDAYS, type AttendanceRollRoom } from "@/lib/data/attendance-roll";

const dayFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });

function cellLabel(day: { start: string | null; end: string | null }): string {
  if (!day.start || !day.end) return "";
  return `${formatTime(day.start)}–${formatTime(day.end)}`;
}

/** One room's booked sessions roll. Each printed page is clearly titled as
 * a BOOKED roll (not an attendance record), with the room, the week's NZ
 * dates and the date it was printed. Rows are tall enough to write on, and
 * the last column is left for notes and changes. `pageBreakAfter` puts each
 * room on its own A4 page (left off the last room so printing doesn't end
 * on a blank page). */
export function AttendanceRollTable({
  room,
  weekStartDate,
  weekLabel,
  printedOn,
  pageBreakAfter = false,
}: {
  room: AttendanceRollRoom;
  weekStartDate: string;
  weekLabel: string;
  printedOn: string;
  pageBreakAfter?: boolean;
}) {
  const colors = getRoomColorClasses(room.color);

  return (
    <section
      className={`break-inside-avoid overflow-hidden rounded-2xl border border-charcoal/10 bg-white print:rounded-none print:border-0 ${
        pageBreakAfter ? "print:break-after-page" : ""
      }`}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-charcoal/10 bg-lilac-50 px-4 py-3 print:border-b-2 print:border-charcoal print:bg-white print:px-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal">Booked sessions roll · not a record of attendance</p>
          <h2 className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-charcoal print:text-2xl">
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full print:hidden ${colors.chip}`} />
            {room.name}
            <span className="text-base font-normal text-charcoal/80">· {weekLabel}</span>
          </h2>
        </div>
        <p className="text-xs text-charcoal/80">
          {room.children.length} {room.children.length === 1 ? "child" : "children"} · Beach Kids · printed {printedOn}
        </p>
      </header>

      {room.children.length === 0 ? (
        <p className="px-4 py-6 text-sm text-charcoal/70">No children currently enrolled in {room.name}.</p>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm print:min-w-0 print:text-[11pt]">
            <thead>
              <tr className="border-b border-charcoal/20 text-xs font-semibold text-charcoal">
                <th scope="col" className="sticky left-0 bg-white px-4 py-2.5 print:static print:px-1">
                  Child
                </th>
                {ATTENDANCE_WEEKDAYS.map((d, i) => (
                  <th key={d.key} scope="col" className="px-3 py-2.5 print:px-1">
                    {d.label} <span className="font-normal text-charcoal/80">{dayFmt.format(new Date(`${addDays(weekStartDate, i)}T00:00:00Z`))}</span>
                  </th>
                ))}
                <th scope="col" className="w-40 px-3 py-2.5 print:w-[22%] print:px-1">
                  Notes and changes
                </th>
              </tr>
            </thead>
            <tbody>
              {room.children.map((c) => (
                <tr key={c.id} className="border-b border-charcoal/10 print:border-charcoal/30">
                  <th scope="row" className="sticky left-0 bg-white px-4 py-2.5 text-left font-medium text-charcoal print:static print:px-1 print:py-3">
                    {c.full_name}
                    {c.tbc && (
                      <span className="ml-1.5 rounded-full bg-status-attentionBg px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-charcoal">
                        TBC
                      </span>
                    )}
                  </th>
                  {ATTENDANCE_WEEKDAYS.map((d) => (
                    <td key={d.key} className="whitespace-nowrap px-3 py-2.5 tabular-nums text-charcoal print:px-1 print:py-3">
                      {c.tbc ? <span className="font-medium">TBC</span> : cellLabel(c.days[d.key]) || <span className="text-charcoal/50">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-charcoal print:px-1 print:py-3">{c.notes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-charcoal/20 font-semibold text-charcoal">
                <th scope="row" className="sticky left-0 bg-canvas px-4 py-2.5 text-left print:static print:bg-white print:px-1">
                  Children booked
                </th>
                {ATTENDANCE_WEEKDAYS.map((d) => (
                  <td key={d.key} className="bg-canvas px-3 py-2.5 tabular-nums print:bg-white print:px-1">
                    {room.bookedTotals[d.key]}
                  </td>
                ))}
                <td className="bg-canvas px-3 py-2.5 print:bg-white" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
