import Link from "next/link";
import { notFound } from "next/navigation";
import { getHazardCheckById } from "@/lib/data/hazard-checks";
import { getStaffList } from "@/lib/data/staff";
import { HazardCheckForm } from "@/components/hazards/hazard-check-form";
import { HazardDailySignoffs } from "@/components/hazards/hazard-daily-signoffs";
import { HazardLogSection } from "@/components/hazards/hazard-log-section";
import { HazardEvidencePhoto } from "@/components/hazards/hazard-evidence-photo";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import { formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HazardCheckPage({ params }: { params: { id: string } }) {
  const [check, staff] = await Promise.all([
    getHazardCheckById(params.id),
    // Both current and former staff — the person who signed a check off a
    // while ago may since have left, and their name still needs to show.
    getStaffList(),
  ]);

  if (!check) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records/hazards" className="hover:text-charcoal">
          Daily Hazard Checks
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">
          {check.room_name} — Week of {formatShortDate(check.week_start_date)}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">{check.room_name}</h1>
          <p className="mt-1 text-sm text-charcoal/60">Week of {formatShortDate(check.week_start_date)}</p>
        </div>
        {check.dailySignoffs.length > 0 && check.dailySignoffs.every((s) => s.signed_off) ? (
          <StatusBadge tone="ready">
            {check.dailySignoffs.filter((s) => s.signed_off).length}/{check.dailySignoffs.length} days signed off
          </StatusBadge>
        ) : (
          <StatusBadge tone="attention">
            {check.dailySignoffs.filter((s) => s.signed_off).length}/{check.dailySignoffs.length} days signed off
          </StatusBadge>
        )}
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Signed paper checklist
        </h2>
        <HazardEvidencePhoto checkId={check.id} photoUrl={check.evidencePhotoUrl} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Checklist</h2>
        <HazardCheckForm check={check} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Daily sign-off</h2>
        <HazardDailySignoffs signoffs={check.dailySignoffs} staff={staff} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Hazard Log</h2>
        <HazardLogSection checkId={check.id} entries={check.logEntries} />
      </section>
    </div>
  );
}
