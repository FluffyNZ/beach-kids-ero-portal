"use client";

import { WEEKDAYS } from "@/lib/constants";
import { addDays } from "@/lib/utils";
import { parseSunblockDetails } from "@/lib/sunblock-format";
import type { SunblockChartChild } from "@/lib/data/sunblock-charts";

// One printed room-week sheet, laid out in millimetres so the on-screen
// preview is the printed page: A4 landscape (297 × 210mm) less the 8mm
// @page margin leaves 281 × 194mm; the sheet keeps 2mm in hand.
export const SHEET_WIDTH_MM = 281;
export const SHEET_HEIGHT_MM = 192;
const MASTHEAD_MM = 13;
const GAP_MM = 2;
const HEAD_ROW1_MM = 7.5;
const HEAD_ROW2_MM = 4;
const LEGEND_MM = 9;
const BODY_MM = SHEET_HEIGHT_MM - MASTHEAD_MM - GAP_MM - HEAD_ROW1_MM - HEAD_ROW2_MM - LEGEND_MM; // 156.5

// Columns (mm): 52 + 74 + 10 × 15.5 = 281.
const NAME_COL_MM = 52;
const NOTES_COL_MM = 74;
const SESSION_COL_MM = 15.5;
const CELL_PAD_MM = 3; // left + right padding in the text columns

// Row heights are worked out here rather than left to the browser, so a
// room's chart always fits one page. Text heights are deliberately
// over-estimated (wide fallback fonts, word-wrap slack) so the content
// never needs more than the height it's given.
const NAME_CHAR_MM = 2.1 * 1.15; // 9pt semibold
const NAME_LINE_MM = 4;
const NOTE_CHAR_MM = 1.3 * 1.15; // 7pt
const NOTE_LINE_MM = 3;
const ROW_PAD_MM = 1.2;
const MAX_ROW_MM = 10;
const MIN_ROW_MM = 5.5;
const SPARE_ROWS = 3;

function lines(text: string, colMm: number, charMm: number) {
  if (!text) return 0;
  const perLine = Math.max(1, Math.floor((colMm - CELL_PAD_MM) / charMm));
  return text.split("\n").reduce((n, part) => n + Math.max(1, Math.ceil(part.length / perLine)), 0);
}

function specialText(child: SunblockChartChild) {
  if (!child.uses_own_sunblock) return "";
  const { product, instructions } = parseSunblockDetails(child.sunblock_instructions);
  if (!product && !instructions) return "Own sunblock — details not recorded";
  return product && instructions ? `${product}. ${instructions}` : product || instructions;
}

/** Minimum height each child's row needs for its name and instructions. */
function neededMm(child: SunblockChartChild) {
  const name = (child.uses_own_sunblock ? "★ " : "") + child.full_name;
  const nameH = lines(name, NAME_COL_MM, NAME_CHAR_MM) * NAME_LINE_MM + (child.bookingStatus !== "booked" ? NOTE_LINE_MM : 0);
  const noteH = lines(specialText(child), NOTES_COL_MM, NOTE_CHAR_MM) * NOTE_LINE_MM;
  return Math.max(nameH, noteH) + ROW_PAD_MM;
}

/** Shares the body height between the children's rows and the spare rows.
 * Fewer spare rows are used only if a room is too full for three. */
export function layoutRows(children: SunblockChartChild[]) {
  const needs = children.map(neededMm);
  for (let spare = SPARE_ROWS; spare >= 1; spare--) {
    for (let h = MAX_ROW_MM; h >= MIN_ROW_MM - 1e-9; h -= 0.1) {
      const heights = needs.map((n) => Math.max(h, n));
      const total = heights.reduce((a, b) => a + b, 0) + spare * h;
      if (total <= BODY_MM) return { heights, spareHeight: h, spare, fits: true };
    }
  }
  return { heights: needs.map((n) => Math.max(MIN_ROW_MM, n)), spareHeight: MIN_ROW_MM, spare: 1, fits: false };
}

const dayFmt = new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function utc(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const fmtDay = (date: string) => dayFmt.format(utc(date)).replace(",", "");

/** e.g. "Mon 16 Nov – Fri 20 Nov 2026" */
export function formatWeekRange(weekStartDate: string) {
  const end = addDays(weekStartDate, 4);
  const startYear = weekStartDate.slice(0, 4);
  const endYear = end.slice(0, 4);
  return `${fmtDay(weekStartDate)}${startYear !== endYear ? ` ${startYear}` : ""} – ${fmtDay(end)} ${endYear}`;
}

const border = "border border-black/70";
const greyCell = "bg-[#ececec] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

function GreyCell({ colSpan, label }: { colSpan?: number; label: string }) {
  return (
    <td colSpan={colSpan} className={`${border} ${greyCell} text-center align-middle text-[9pt]`}>
      <span aria-hidden="true">–</span>
      <span className="sr-only">{label}</span>
    </td>
  );
}

function SpecialDetails({ child }: { child: SunblockChartChild }) {
  if (!child.uses_own_sunblock) return null;
  const { product, instructions } = parseSunblockDetails(child.sunblock_instructions);
  if (!product && !instructions) return <span className="italic">Own sunblock — details not recorded</span>;
  return (
    <>
      {product && <span className="font-bold">{product}</span>}
      {product && instructions && <span>. </span>}
      {instructions && <span className="whitespace-pre-line">{instructions}</span>}
    </>
  );
}

export type SunblockChartTableProps = {
  room: { id: string; name: string };
  weekStartDate: string;
  children: SunblockChartChild[];
  /** date → public holiday name, for days the centre is closed */
  closedDays: Record<string, string>;
  /** e.g. "18 Nov 2026" */
  printedOn: string;
  onSelectChild?: (child: SunblockChartChild) => void;
};

/** A printable weekly sunblock chart for one room: children down the left,
 * Monday–Friday across the top with separate AM and PM writing spaces.
 * Sessions a child isn't booked for (or days the centre is closed) are grey
 * with a dash. Nothing on this sheet records attendance or an application —
 * it's for staff to fill in by hand. */
export function SunblockChartTable({ room, weekStartDate, children, closedDays, printedOn, onSelectChild }: SunblockChartTableProps) {
  const days = WEEKDAYS.map((d, i) => {
    const date = addDays(weekStartDate, i);
    return { ...d, date, closed: closedDays[date] ?? null };
  });
  const closed = days.filter((d) => d.closed);
  const layout = layoutRows(children);
  const anySpecial = children.some((c) => c.uses_own_sunblock);

  return (
    <div
      className="flex flex-col bg-white font-sans text-black"
      style={{ width: `${SHEET_WIDTH_MM}mm`, height: `${SHEET_HEIGHT_MM}mm` }}
      data-sheet
      data-fits={layout.fits ? "true" : "false"}
    >
      {/* Masthead */}
      <div className="flex items-end justify-between gap-6 border-b-2 border-black pb-[1.5mm]" style={{ height: `${MASTHEAD_MM}mm` }}>
        <div className="min-w-0">
          <p className="text-[8.5pt] font-semibold uppercase leading-tight tracking-wide">Beach Kids Waihi</p>
          <p className="truncate text-[15pt] font-bold leading-tight">Sunblock chart · {room.name}</p>
        </div>
        <div className="shrink-0 text-right leading-tight">
          <p className="text-[11pt] font-semibold">{formatWeekRange(weekStartDate)}</p>
          {closed.length > 0 && (
            <p className="text-[8pt]">Closed: {closed.map((d) => `${fmtDay(d.date)} (${d.closed})`).join(", ")}</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ marginTop: `${GAP_MM}mm` }} className="flex-1">
        <table className="w-full table-fixed border-collapse text-[9pt] leading-tight">
          <colgroup>
            <col style={{ width: `${NAME_COL_MM}mm` }} />
            <col style={{ width: `${NOTES_COL_MM}mm` }} />
            {days.flatMap((d) => [
              <col key={`${d.key}-am`} style={{ width: `${SESSION_COL_MM}mm` }} />,
              <col key={`${d.key}-pm`} style={{ width: `${SESSION_COL_MM}mm` }} />,
            ])}
          </colgroup>
          <thead>
            <tr style={{ height: `${HEAD_ROW1_MM}mm` }}>
              <th rowSpan={2} scope="col" className={`${border} px-[1.5mm] text-left align-bottom text-[9pt] font-bold`}>
                Child
              </th>
              <th rowSpan={2} scope="col" className={`${border} px-[1.5mm] text-left align-bottom text-[8pt] font-bold`}>
                ★ Own/special sunblock — product and instructions
              </th>
              {days.map((d) => (
                <th key={d.key} colSpan={2} scope="colgroup" className={`${border} px-[1mm] text-center text-[9pt] font-bold`}>
                  {fmtDay(d.date)}
                  {d.closed && <span className="block text-[7pt] font-semibold uppercase">Closed</span>}
                </th>
              ))}
            </tr>
            <tr style={{ height: `${HEAD_ROW2_MM}mm` }}>
              {days.flatMap((d) => [
                <th key={`${d.key}-am`} scope="col" className={`${border} text-center text-[7.5pt] font-semibold`}>
                  AM
                </th>,
                <th key={`${d.key}-pm`} scope="col" className={`${border} text-center text-[7.5pt] font-semibold`}>
                  PM
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {children.map((c, i) => {
              // Without confirmed booked days, leave every open day writable.
              const open = c.bookingStatus !== "booked";
              return (
                <tr key={c.id} style={{ height: `${layout.heights[i].toFixed(2)}mm` }}>
                  <th scope="row" className={`${border} px-[1.5mm] py-0 text-left align-middle font-semibold`}>
                    {onSelectChild ? (
                      <button
                        type="button"
                        onClick={() => onSelectChild(c)}
                        className="rounded-sm text-left font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
                        title="Manage sunblock details"
                      >
                        {c.uses_own_sunblock && <span aria-hidden="true">★ </span>}
                        {c.full_name}
                        {c.uses_own_sunblock && <span className="sr-only"> (own or special sunblock)</span>}
                      </button>
                    ) : (
                      <>
                        {c.uses_own_sunblock && <span aria-hidden="true">★ </span>}
                        {c.full_name}
                      </>
                    )}
                    {c.bookingStatus === "missing" && <span className="block text-[7pt] font-normal italic">No booking on file</span>}
                    {c.bookingStatus === "tbc" && <span className="block text-[7pt] font-normal italic">Booking to be confirmed</span>}
                  </th>
                  <td className={`${border} px-[1.5mm] py-0 align-middle text-[7pt] leading-[1.2]`}>
                    <SpecialDetails child={c} />
                  </td>
                  {days.map((d) => {
                    if (d.closed) return <GreyCell key={d.key} colSpan={2} label="Centre closed" />;
                    if (!open && !c.bookedDays[d.key]) return <GreyCell key={d.key} colSpan={2} label="Not booked" />;
                    const half = open ? { am: true, pm: true } : c.sessions[d.key];
                    if (!half.am && !half.pm) return <GreyCell key={d.key} colSpan={2} label="Not booked" />;
                    return (["am", "pm"] as const).map((h) =>
                      half[h] ? (
                        <td key={`${d.key}-${h}`} className={border} />
                      ) : (
                        <GreyCell key={`${d.key}-${h}`} label={h === "am" ? "Not booked in the morning" : "Not booked in the afternoon"} />
                      )
                    );
                  })}
                </tr>
              );
            })}
            {Array.from({ length: layout.spare }).map((_, i) => (
              <tr key={`spare-${i}`} style={{ height: `${layout.spareHeight.toFixed(2)}mm` }}>
                <td className={border}>
                  <span className="sr-only">Spare row</span>
                </td>
                <td className={border} />
                {days.map((d) =>
                  d.closed ? (
                    <GreyCell key={d.key} colSpan={2} label="Centre closed" />
                  ) : (
                    [<td key={`${d.key}-am`} className={border} />, <td key={`${d.key}-pm`} className={border} />]
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-end justify-between gap-4 text-[7.5pt] leading-snug" style={{ height: `${LEGEND_MM}mm` }}>
        <div>
          <p>
            <span className="font-bold">Tick or initial</span> AM and PM when sunblock is applied
            <span className="px-[2mm]">·</span>
            <span className="font-bold">A</span> = Absent
            <span className="px-[2mm]">·</span>
            <span className={`inline-block h-[3mm] w-[6mm] border border-black/70 text-center align-middle leading-[3mm] ${greyCell}`}>–</span>{" "}
            Not booked or centre closed
            <span className="px-[2mm]">·</span>
            <span className="font-bold">★</span> Own/special sunblock{anySpecial ? " — follow the instructions" : ""}
          </p>
          <p>Shading comes from booked sessions on file; bookings aren&apos;t a record of attendance. Add any other children in the spare rows.</p>
        </div>
        <p className="shrink-0 text-right">Printed {printedOn}</p>
      </div>
    </div>
  );
}
