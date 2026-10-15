import { getRoomColorClasses } from "@/lib/constants";
import type { SunblockChecklistRoom } from "@/lib/data/sunblock-checklist";

// Extra blank rows per room for a child who isn't on the regular roll yet
// (a drop-in, a sibling visiting for the day, a brand-new enrolment the
// schedule hasn't been set up for) — hand-write the name in and tick same
// as everyone else. Not data, just print space, so a plain constant is
// all this needs.
const EXTRA_ROWS = 5;

/** An empty square for a pen tick — deliberately a plain bordered box, not
 * an <input type="checkbox">, since real checkbox widgets print
 * inconsistently (native shadows/shapes) across browsers. This is paper,
 * not a form someone fills in on screen. */
function TickBox() {
  return <span aria-hidden className="inline-block h-5 w-5 border-2 border-charcoal/40" />;
}

/** One room's sunblock tick sheet for a single day — AM (before outside
 * play) and PM (after lunch reapply) columns per DESIGN_SYSTEM.md room
 * colour conventions, same card/table shell as the Weekly Booked Sessions
 * roll's AttendanceRollTable so the two printed documents feel like the
 * same family. `pageBreakAfter` puts a hard page break after this room when
 * printing, one room per A4 page — leave it off the last room so printing
 * doesn't end on a trailing blank page. */
export function SunblockChecklistTable({
  room,
  dateLabel,
  pageBreakAfter = false,
}: {
  room: SunblockChecklistRoom;
  dateLabel: string;
  pageBreakAfter?: boolean;
}) {
  const colors = getRoomColorClasses(room.color);

  return (
    <section className={`card break-inside-avoid overflow-hidden p-0 ${pageBreakAfter ? "print:break-after-page" : ""}`}>
      <div className={`flex flex-wrap items-center gap-2 px-4 py-3 ${colors.bg}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.chip}`} />
        <h2 className={`font-display text-lg font-semibold ${colors.text}`}>{room.name}</h2>
        <span className={`text-xs font-medium ${colors.text} opacity-70`}>Sunblock checklist · {dateLabel}</span>
        <span className={`ml-auto text-xs font-medium ${colors.text}`}>
          {room.children.length} {room.children.length === 1 ? "child" : "children"} enrolled
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/50">
              <th className="px-4 py-3 font-medium">Child</th>
              <th className="w-24 px-3 py-3 text-center font-medium">
                AM
                <span className="block font-normal normal-case text-charcoal/40">before outside play</span>
              </th>
              <th className="w-24 px-3 py-3 text-center font-medium">
                PM
                <span className="block font-normal normal-case text-charcoal/40">reapplied after lunch</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {room.children.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-sm text-charcoal/50">
                  No children enrolled in {room.name} on {dateLabel}.
                </td>
              </tr>
            )}
            {room.children.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-charcoal">
                  {c.full_name}
                  {c.tbc && (
                    <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-status-attention">
                      TBC
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <TickBox />
                </td>
                <td className="px-3 py-3 text-center">
                  <TickBox />
                </td>
              </tr>
            ))}
            {Array.from({ length: EXTRA_ROWS }).map((_, i) => (
              <tr key={`extra-${i}`}>
                <td className="px-4 py-3">
                  <span className="block w-full border-b border-charcoal/20 pt-4 text-xs text-charcoal/30 print:text-transparent">
                    (write name here)
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <TickBox />
                </td>
                <td className="px-3 py-3 text-center">
                  <TickBox />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
