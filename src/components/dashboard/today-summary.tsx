import type { TodaySummary } from "@/lib/data/home";

/**
 * Phase 3 (Contra visual refit): these four figures used to be four
 * separate bordered/shadowed KPI tiles. Contra doesn't scatter a dashboard
 * into lots of small cards — it puts related figures inline inside one
 * surface (see DESIGN_SYSTEM.md). This renders as a plain inline metrics
 * row; the bordered surface itself now lives in the Home dashboard page,
 * wrapping this row together with Rooms Today.
 *
 * Still deliberately plain (no colour, no status tone) — these are facts,
 * not status signals. "Signed in" always reads "—, Not tracked yet": there
 * is no live sign-in/out record in the schema, and this dashboard doesn't
 * invent one.
 */
export function TodaySummaryInline({ summary }: { summary: TodaySummary }) {
  const metrics: { label: string; value: string | number; caption?: string }[] = [
    {
      label: "Children expected",
      value: summary.isWeekend ? "—" : summary.childrenExpectedToday ?? 0,
      caption: summary.isWeekend ? "Closed weekends" : undefined,
    },
    {
      label: "Staff rostered",
      value: summary.staffRosteredToday,
      caption: summary.staffRosteredToday === 0 ? "Nothing entered yet" : undefined,
    },
    {
      label: "Rooms operating",
      value: summary.isWeekend ? "—" : `${summary.roomsOperatingToday}/${summary.roomsTotal}`,
      caption: summary.isWeekend ? "Closed weekends" : undefined,
    },
    { label: "Signed in", value: "—", caption: "Not tracked yet" },
  ];

  return (
    <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col">
          <span className="text-xs font-medium text-charcoal/50">{m.label}</span>
          <span className="text-xl font-semibold tracking-tight text-charcoal">{m.value}</span>
          {m.caption && <span className="text-[11px] text-charcoal/40">{m.caption}</span>}
        </div>
      ))}
    </div>
  );
}
