import type { TodaySummary } from "@/lib/data/home";

function MetricTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className="card flex flex-col gap-1.5 p-4">
      <p className="text-xs font-medium text-charcoal/50">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-charcoal">{value}</p>
      {caption && <p className="text-[11px] text-charcoal/40">{caption}</p>}
    </div>
  );
}

/**
 * The four "Today at Beach Kids" tiles. Deliberately plain (no colour, no
 * tone) — these are facts, not status signals, so they stay neutral per the
 * design system rather than reading like coloured KPI tiles. "Children
 * signed in" is always shown as "Not tracked yet": there's no live
 * sign-in/out record in the schema, and this dashboard doesn't invent one.
 */
export function TodaySummaryGrid({ summary }: { summary: TodaySummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricTile
        label="Children expected"
        value={summary.isWeekend ? "—" : summary.childrenExpectedToday ?? 0}
        caption={summary.isWeekend ? "Closed weekends" : undefined}
      />
      <MetricTile
        label="Staff rostered"
        value={summary.staffRosteredToday}
        caption={summary.staffRosteredToday === 0 ? "Nothing entered for today yet" : undefined}
      />
      <MetricTile
        label="Rooms operating"
        value={summary.isWeekend ? "—" : `${summary.roomsOperatingToday}/${summary.roomsTotal}`}
        caption={summary.isWeekend ? "Closed weekends" : "Of the centre's rostered rooms"}
      />
      <MetricTile label="Children signed in" value="—" caption="Not tracked yet" />
    </div>
  );
}
