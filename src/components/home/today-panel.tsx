import Link from "next/link";
import type { TodayOverview } from "@/lib/data/home-dashboard";

function Metric({
  label,
  value,
  note,
  link,
  emphasise = false,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  link?: { label: string; href: string };
  /** For a status message (e.g. "Roster not entered") rather than a number. */
  emphasise?: boolean;
}) {
  return (
    <div className="flex flex-col bg-white px-5 py-4">
      <p className="text-sm text-charcoal/70">{label}</p>
      <p className={emphasise ? "mt-1.5 text-base font-semibold text-charcoal" : "mt-1 text-[1.75rem] font-semibold leading-none tracking-tight text-charcoal"}>
        {value}
      </p>
      {note && <p className="mt-1.5 text-sm text-charcoal/70">{note}</p>}
      {link && (
        <Link
          href={link.href}
          className="mt-2 self-start rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
        >
          {link.label} →
        </Link>
      )}
    </div>
  );
}

/** "Today at your centre": four compact figures from real records, with
 * missing information named as missing ("Roster not entered") instead of
 * being shown as 0. Children are bookings from enrolment schedules —
 * sign-in/out isn't recorded in Earlydesk, so no attendance figure is shown. */
export function TodayPanel({
  overview,
  attentionCount,
  urgentCount,
}: {
  overview: TodayOverview;
  attentionCount: number;
  urgentCount: number;
}) {
  const closed = overview.closedReason;

  return (
    <section aria-labelledby="today-heading" className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h2 id="today-heading" className="text-base font-semibold text-charcoal">
          Today at your centre
        </h2>
        {closed && (
          <span className="rounded-full bg-lilac-100 px-2.5 py-1 text-xs font-medium text-charcoal">{closed}</span>
        )}
      </header>

      <div className="grid grid-cols-2 gap-px border-y border-charcoal/10 bg-charcoal/10 lg:grid-cols-4">
        <Metric
          label="Children booked"
          value={overview.childrenExpected === null ? "—" : overview.childrenExpected}
          note={closed ? "Centre closed" : "From enrolment schedules"}
        />
        {closed ? (
          <Metric label="Staff rostered" value="—" note="Centre closed" />
        ) : overview.rosterEntered ? (
          <Metric
            label="Staff rostered"
            value={overview.staffRosteredToday}
            note={overview.staffRosteredToday === 0 ? "No one rostered for today" : "Different people on today's roster"}
          />
        ) : (
          <Metric
            label="Staff rostered"
            value="Roster not entered"
            emphasise
            note="This week has no shifts yet"
            link={{ label: "Complete roster", href: `/roster?week=${overview.weekStart}` }}
          />
        )}
        <Metric
          label="Rooms operating"
          value={closed ? "—" : `${overview.roomsOperating} of ${overview.roomsTotal}`}
          note={closed ? "Centre closed" : "With bookings or staff today"}
        />
        <Metric
          label="Needs attention"
          value={attentionCount}
          note={attentionCount === 0 ? "Nothing outstanding" : urgentCount > 0 ? `${urgentCount} urgent` : "Nothing urgent"}
          link={attentionCount > 0 ? { label: "See list", href: "#needs-attention" } : undefined}
        />
      </div>

      <div className="flex flex-col gap-1 px-5 py-3 text-sm text-charcoal/70 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        {!closed && overview.dailyChecks && (
          <p>
            Daily hazard checks:{" "}
            <span className="font-medium text-charcoal">
              {overview.dailyChecks.signedOff} of {overview.dailyChecks.total} rooms signed off
            </span>{" "}
            ·{" "}
            <Link
              href="/records/hazards"
              className="rounded font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
            >
              Open daily checks
            </Link>
          </p>
        )}
        <p>Children numbers are bookings — sign-in and sign-out aren&apos;t recorded in Earlydesk.</p>
      </div>
    </section>
  );
}
