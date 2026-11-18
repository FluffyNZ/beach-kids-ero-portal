"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SunblockChartTable, layoutRows } from "@/components/children/sunblock-chart-table";
import {
  SunblockChartControls,
  type SunblockPeriodType,
  type SunblockRoomOption,
} from "@/components/children/sunblock-chart-controls";
import { SunblockDetailsDrawer, type SunblockDetailsChild } from "@/components/children/sunblock-details-drawer";
import { getRoomColorClasses } from "@/lib/constants";
import { addDays, formatShortDate } from "@/lib/utils";
import type { SunblockChartChild } from "@/lib/data/sunblock-charts";

export type SunblockChartPage = {
  key: string; // unique per room + week
  room: { id: string; name: string; color: string };
  weekStartDate: string;
  children: SunblockChartChild[];
  /** date → public holiday name */
  closedDays: Record<string, string>;
};

// A4 landscape in CSS pixels (96 per inch).
const PAPER_W_PX = (297 / 25.4) * 96;

const PRINT_CSS = `
@media print { @page { size: A4 landscape; margin: 8mm; } }
.sb-paper { width: 297mm; height: 210mm; padding: 8mm; transform: scale(var(--sb-scale, 1)); transform-origin: top left; }
.sb-frame { height: calc(210mm * var(--sb-scale, 1)); contain: inline-size; }
@media print {
  .sb-frame { height: auto !important; overflow: visible !important; contain: none; }
  .sb-paper { width: auto; height: auto; padding: 0; transform: none; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
  .sb-page { break-after: page; break-inside: avoid; }
  .sb-page:last-child { break-after: auto; }
}`;

/** The Sunblock Charts workspace: options and summary, a page-by-page
 * preview that is the printed sheet, and "Manage sunblock details". */
export function SunblockChartsWorkspace({
  pages,
  printedOn,
  rangeLabel,
  detailsChildren,
  controls,
}: {
  pages: SunblockChartPage[];
  printedOn: string;
  rangeLabel: string;
  detailsChildren: SunblockDetailsChild[];
  controls: {
    period: SunblockPeriodType;
    week: string;
    month: string;
    from: string;
    to: string;
    roomId: string;
    rooms: SunblockRoomOption[];
  };
}) {
  const [current, setCurrent] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editChildId, setEditChildId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);

  const selectionKey = pages.map((p) => p.key).join("|");
  useEffect(() => setCurrent(0), [selectionKey]);
  const index = Math.min(current, Math.max(0, pages.length - 1));
  const page = pages[index];

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / PAPER_W_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pages.length]);

  const weeks = useMemo(() => Array.from(new Set(pages.map((p) => p.weekStartDate))), [pages]);
  const roomCount = useMemo(() => new Set(pages.map((p) => p.room.id)).size, [pages]);

  // Children whose booking isn't on file or is still to be confirmed —
  // their days are left open on the chart rather than shaded.
  const unclear = useMemo(() => {
    const seen = new Map<string, { name: string; room: string; status: string }>();
    pages.forEach((p) =>
      p.children.forEach((c) => {
        if (c.bookingStatus !== "booked") seen.set(c.id, { name: c.full_name, room: p.room.name, status: c.bookingStatus });
      })
    );
    return Array.from(seen.values());
  }, [pages]);

  // Pages whose children and instructions need more room than one sheet.
  const tooFull = useMemo(() => pages.filter((p) => !layoutRows(p.children).fits), [pages]);

  const openDetails = useCallback((childId: string | null) => {
    setEditChildId(childId);
    setDrawerOpen(true);
  }, []);
  const closeDetails = useCallback(() => {
    setDrawerOpen(false);
    setEditChildId(null);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 print:max-w-none print:gap-0">
      <style>{PRINT_CSS}</style>

      <div className="print:hidden">
        <PageHeader
          title="Sunblock Charts"
          description="Print weekly room charts for staff to record sunblock applications."
          actions={
            <button type="button" className="btn-secondary" onClick={() => openDetails(null)}>
              Manage sunblock details
            </button>
          }
        />
      </div>

      <SunblockChartControls
        {...controls}
        summary={{ rooms: roomCount, weeks: weeks.length, pages: pages.length, rangeLabel }}
        onPrint={() => window.print()}
      />

      {unclear.length > 0 && (
        <div role="note" className="rounded-xl border border-status-attention/40 bg-status-attentionBg px-4 py-3 text-sm text-charcoal print:hidden">
          <p className="font-medium">
            {unclear.length === 1 ? "1 child has" : `${unclear.length} children have`} no confirmed booking on file, so every
            day is left open on their chart:
          </p>
          <p className="mt-0.5">
            {unclear.map((u) => `${u.name} (${u.room}${u.status === "tbc" ? ", to be confirmed" : ""})`).join(", ")}
          </p>
        </div>
      )}

      {tooFull.length > 0 && (
        <div role="note" className="rounded-xl border border-status-action/40 bg-status-actionBg px-4 py-3 text-sm text-charcoal print:hidden">
          <p className="font-medium">
            {tooFull.length === 1 ? "1 chart" : `${tooFull.length} charts`} may not fit on one page:{" "}
            {Array.from(new Set(tooFull.map((p) => p.room.name))).join(", ")}.
          </p>
          <p className="mt-0.5">Shorten the longest sunblock instructions for that room, or check the print preview before printing.</p>
        </div>
      )}

      {!page ? (
        <div className="card print:hidden">
          <EmptyState title="No charts for this selection" description="Choose another room or period." />
        </div>
      ) : (
        <section aria-label="Print preview" className="flex flex-col gap-3 print:block">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-base font-semibold text-charcoal">Preview</h2>
              <p className="text-sm text-charcoal/70">
                Page {index + 1} of {pages.length} · {page.room.name} · {page.children.length}{" "}
                {page.children.length === 1 ? "child" : "children"} · select a name to manage sunblock details
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn-secondary px-2.5 py-1.5"
                disabled={index === 0}
                onClick={() => setCurrent(index - 1)}
                aria-label="Previous page"
              >
                ←
              </button>
              <label htmlFor="sunblock-page" className="sr-only">
                Go to page
              </label>
              <select
                id="sunblock-page"
                className="input w-64 py-1.5"
                value={index}
                onChange={(e) => setCurrent(Number(e.target.value))}
              >
                {weeks.map((w) => (
                  <optgroup key={w} label={`Week of ${formatShortDate(w)} – ${formatShortDate(addDays(w, 4))}`}>
                    {pages.map((p, i) =>
                      p.weekStartDate === w ? (
                        <option key={p.key} value={i}>
                          {i + 1}. {p.room.name} · {formatShortDate(w)}
                        </option>
                      ) : null
                    )}
                  </optgroup>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary px-2.5 py-1.5"
                disabled={index === pages.length - 1}
                onClick={() => setCurrent(index + 1)}
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </div>

          {roomCount > 1 && (
            <div className="flex flex-wrap gap-1.5 print:hidden" role="group" aria-label="Rooms this week">
              {pages
                .map((p, i) => ({ p, i }))
                .filter(({ p }) => p.weekStartDate === page.weekStartDate)
                .map(({ p, i }) => (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={i === index}
                    onClick={() => setCurrent(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal ${
                      i === index
                        ? "border-lilac-600 bg-lilac-100 text-charcoal"
                        : "border-charcoal/15 bg-white text-charcoal hover:bg-lilac-50"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${getRoomColorClasses(p.room.color).chip}`} aria-hidden="true" />
                    {p.room.name}
                  </button>
                ))}
            </div>
          )}

          <div
            ref={frameRef}
            className="sb-frame overflow-hidden"
            style={{ ["--sb-scale" as string]: scale } as React.CSSProperties}
          >
            {pages.map((p, i) => (
              <div key={p.key} className={`sb-page ${i === index ? "" : "hidden print:block"}`} aria-hidden={i === index ? undefined : true}>
                <div className="sb-paper rounded-sm border border-charcoal/10 bg-white shadow-[0_1px_3px_rgba(41,39,53,0.12)]">
                  <SunblockChartTable
                    room={p.room}
                    weekStartDate={p.weekStartDate}
                    children={p.children}
                    closedDays={p.closedDays}
                    printedOn={printedOn}
                    onSelectChild={i === index ? (c) => openDetails(c.id) : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-charcoal/70 print:hidden">
        Shading comes from each child&apos;s regular booked days on file — a one-off extra day or absence won&apos;t show,
        and bookings aren&apos;t a record of attendance or of sunblock being applied. Children appear in their current
        room for every week printed, as past room changes aren&apos;t kept.
      </p>

      <SunblockDetailsDrawer
        open={drawerOpen}
        onClose={closeDetails}
        childrenList={detailsChildren}
        defaultRoomId={controls.roomId}
        editChildId={editChildId}
        onEditChildChange={setEditChildId}
      />
    </div>
  );
}
