"use client";

import { getRoomColorClasses, WEEKDAYS, type Weekday } from "@/lib/constants";
import { formatShortDate, addDays } from "@/lib/utils";
import type { SunblockChartChild } from "@/lib/data/sunblock-charts";

// Two blank rows per room, per the brief — space for a drop-in or a
// visiting sibling to be hand-written in on the printed sheet.
const EXTRA_ROWS = 2;

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

/** An empty square for a pen tick — a plain bordered box, not an
 * <input type="checkbox">, since real checkbox widgets print inconsistently
 * (native shadows/shapes) across browsers. This is paper, not an on-screen
 * form. */
function TickBox() {
  return (
    <span aria-hidden className="mx-auto block h-4 w-4 border-2 border-charcoal/50 print:h-3 print:w-3 print:border print:border-black" />
  );
}

export type SunblockChartTableProps = {
  room: { id: string; name: string; color: string };
  weekStartDate: string;
  children: SunblockChartChild[];
  closedDays: Set<string>;
  pageBreakAfter?: boolean;
  onSelectChild: (child: SunblockChartChild) => void;
};

/** One room's printable weekly sunblock chart — AM and PM tick columns for
 * each weekday, shaded with a dash on a day the child isn't booked or the
 * centre's closed. `pageBreakAfter` puts a hard page break after this
 * table when printing, one room-week per landscape A4 sheet; leave it off
 * the very last table so printing doesn't end on a trailing blank page. */
export function SunblockChartTable({
  room,
  weekStartDate,
  children,
  closedDays,
  pageBreakAfter = false,
  onSelectChild,
}: SunblockChartTableProps) {
  const colors = getRoomColorClasses(room.color);
  const weekEndDate = addDays(weekStartDate, 4);

  return (
    <section
      className={`card break-inside-avoid overflow-hidden p-0 print:overflow-visible print:rounded-none print:border-black ${
        pageBreakAfter ? "print:break-after-page" : ""
      }`}
    >
      {/* Print-only masthead — matches the on-screen header below it but is
          the one that actually shows up on paper (the on-screen one is
          print:hidden, scoped per print page so every printed sheet carries
          its own title instead of just the first one). */}
      <div className="hidden items-start justify-between gap-2 px-3 pb-1 pt-2 print:flex">
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-black">Beach Kids Waihi</p>
          <p className="text-xs text-black">Weekly sunblock chart</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase text-black">{room.name}</p>
          <p className="text-xs text-black">
            {formatShortDate(weekStartDate)} – {formatShortDate(weekEndDate)}
          </p>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-2 px-4 py-3 ${colors.bg} print:hidden`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.chip}`} />
        <h2 className={`font-display text-lg font-semibold ${colors.text}`}>{room.name}</h2>
        <span className={`text-xs font-medium ${colors.text} opacity-70`}>
          Week of {formatShortDate(weekStartDate)}
        </span>
        <span className={`ml-auto text-xs font-medium ${colors.text}`}>
          {children.length} {children.length === 1 ? "child" : "children"} enrolled
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm print:text-xs">
          <colgroup>
            <col className="w-[18%]" />
            {WEEKDAYS.map((d) => (
              <col key={d.key} className="w-[16.4%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/50 print:border-black print:text-black">
              <th className="px-3 py-2 font-medium print:px-1.5 print:py-0.5">Child</th>
              {WEEKDAYS.map((d, i) => {
                const date = addDays(weekStartDate, i);
                const isClosed = closedDays.has(date);
                return (
                  <th key={d.key} className="px-1 py-2 font-medium print:py-0.5">
                    <div className="text-center normal-case leading-tight text-charcoal/70 print:text-black">
                      {WEEKDAY_LABELS[d.key]}
                      <span className="block font-normal text-charcoal/40 print:text-black">
                        {formatShortDate(date)}
                      </span>
                      {isClosed && (
                        <span className="block text-[10px] font-semibold uppercase text-status-attention print:text-black">
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-1 text-center text-[10px] font-normal normal-case leading-tight text-charcoal/40 print:mt-0.5 print:text-black">
                      <span>AM</span>
                      <span>PM</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5 print:divide-black/30">
            {children.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-charcoal/50">
                  No children currently enrolled in {room.name}.
                </td>
              </tr>
            )}
            {children.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 align-top font-medium text-charcoal print:px-1.5 print:py-0.5 print:text-black">
                  <button
                    type="button"
                    onClick={() => onSelectChild(c)}
                    className="text-left hover:underline print:pointer-events-none"
                  >
                    {c.full_name}
                  </button>
                  {c.tbc && (
                    <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-status-attention print:text-black">
                      TBC
                    </span>
                  )}
                  {c.uses_own_sunblock && (
                    <div className="mt-0.5 break-words text-[10px] leading-tight text-charcoal/70 print:text-black">
                      <span className="font-bold uppercase">Own sunblock</span>
                      {c.sunblock_instructions && <span> — {c.sunblock_instructions}</span>}
                    </div>
                  )}
                </td>
                {WEEKDAYS.map((d, i) => {
                  const date = addDays(weekStartDate, i);
                  const isClosed = closedDays.has(date);
                  const booked = c.bookedDays[d.key] && !isClosed;
                  return (
                    <td
                      key={d.key}
                      className={`px-1 py-2 text-center align-middle print:py-0.5 ${
                        booked ? "" : "bg-sand-100 print:bg-transparent"
                      }`}
                    >
                      {booked ? (
                        <div className="grid grid-cols-2 gap-x-1">
                          <TickBox />
                          <TickBox />
                        </div>
                      ) : (
                        <span className="text-charcoal/30 print:text-black">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {Array.from({ length: EXTRA_ROWS }).map((_, i) => (
              <tr key={`extra-${i}`}>
                <td className="px-3 py-2 print:px-1.5 print:py-0.5">
                  <span className="block w-full border-b border-charcoal/20 pt-4 text-xs text-charcoal/0 print:pt-1 print:border-black">
                    &nbsp;
                  </span>
                </td>
                {WEEKDAYS.map((d) => (
                  <td key={d.key} className="px-1 py-2 text-center align-middle print:py-0.5">
                    <div className="grid grid-cols-2 gap-x-1">
                      <TickBox />
                      <TickBox />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 px-3 py-2 text-xs text-charcoal/60 print:gap-2 print:py-1 print:border-black print:text-black">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <TickBox /> Applied
          </span>
          <span>— Not booked</span>
          <span>A Absent</span>
        </div>
        <div className="flex min-w-[160px] flex-1 items-center gap-1.5">
          <span className="shrink-0">Notes:</span>
          <span className="h-4 flex-1 border-b border-charcoal/30 print:border-black" />
        </div>
      </div>
    </section>
  );
}
