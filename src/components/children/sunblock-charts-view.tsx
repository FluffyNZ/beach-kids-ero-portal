"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SunblockChartTable } from "@/components/children/sunblock-chart-table";
import { SunblockPreferenceForm } from "@/components/children/sunblock-preference-form";
import type { SunblockChartChild } from "@/lib/data/sunblock-charts";

export type SunblockChartPage = {
  key: string; // unique per room+week, used as the React key / section id
  room: { id: string; name: string; color: string };
  weekStartDate: string;
  children: SunblockChartChild[];
  closedDays: Set<string>;
};

/** Renders every room-week table for the selected period and owns the
 * single shared "sunblock preference" modal — clicking any child's name,
 * on any table, opens the same one modal rather than each table managing
 * its own. Kept as one client component (rather than each table owning
 * state) so a month's worth of tables only ever has one Modal mounted. */
export function SunblockChartsView({ pages }: { pages: SunblockChartPage[] }) {
  const [selected, setSelected] = useState<SunblockChartChild | null>(null);

  return (
    <>
      {pages.map((page, i) => (
        <SunblockChartTable
          key={page.key}
          room={page.room}
          weekStartDate={page.weekStartDate}
          children={page.children}
          closedDays={page.closedDays}
          pageBreakAfter={i < pages.length - 1}
          onSelectChild={setSelected}
        />
      ))}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={`Sunblock preference — ${selected?.full_name ?? ""}`}>
        {selected && (
          <SunblockPreferenceForm
            childId={selected.id}
            initialUsesOwn={selected.uses_own_sunblock}
            initialInstructions={selected.sunblock_instructions}
            onSaved={() => setSelected(null)}
          />
        )}
      </Modal>
    </>
  );
}
