import Link from "next/link";
import { getComplianceOverview } from "@/lib/data/compliance-overview";
import { RECORDS_MODULES } from "@/lib/constants";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function RecordsCompliancePage() {
  const overview = await getComplianceOverview();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Records &amp; Compliance</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Daily checks, hazards, incidents, medication, drills and the rest of Beach Kids&apos; day-to-day compliance
          records — separate from Enrolment and Attendance.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Compliance Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {overview.map((stat) => (
            <StatTile key={stat.key} label={stat.label} value={stat.value ?? "—"} tone={stat.tone} />
          ))}
        </div>
        <p className="mt-3 text-xs text-charcoal/40">
          Figures marked &quot;—&quot; are for modules not built yet, rather than a fabricated zero. Everything else on
          this panel is a real, live count.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECORDS_MODULES.map((mod) => {
            const isLinked = mod.status === "linked" && mod.href;
            const CardInner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-charcoal">{mod.label}</h3>
                  {isLinked ? (
                    <StatusBadge tone="ready">Built</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Coming soon</StatusBadge>
                  )}
                </div>
                <p className="mt-2 text-sm text-charcoal/60">{mod.description}</p>
                {mod.linkedNote && <p className="mt-2 text-xs text-charcoal/40">{mod.linkedNote}</p>}
                {isLinked && (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-burgundy-600">
                    Open <ChevronRightIcon className="h-3.5 w-3.5" />
                  </span>
                )}
              </>
            );

            return isLinked ? (
              <Link key={mod.key} href={mod.href!} className="card p-5 transition-shadow hover:shadow-cardHover">
                {CardInner}
              </Link>
            ) : (
              <div key={mod.key} className="card p-5 opacity-70">
                {CardInner}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card border-ocean-100 bg-ocean-50/40 p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-500">
          Building the rest of this section
        </h2>
        <p className="text-sm leading-relaxed text-ocean-800">
          Six modules are already covered rather than duplicated: Emergency Drills, Staff Compliance Records, Policy
          &amp; Procedure Reviews (existing parts of the site), Accidents/Incidents &amp; Illness, Daily Hazard
          Checks and the Hazard Register (both built from the real paper form). The remaining five — Serious Incident
          Records, Medication Records, Sleep Records, Excursions &amp; RAMS, and Food Records — need the exact
          fields, checklist items, statuses and options you specified before they&apos;re built, so nothing gets
          guessed or invented in the meantime.
        </p>
      </section>
    </div>
  );
}
