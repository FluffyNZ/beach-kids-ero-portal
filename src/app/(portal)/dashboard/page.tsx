import { getDashboardStats, getNeedsAttention } from "@/lib/data/dashboard";
import { getCurrentProfile } from "@/lib/data/profiles";
import { ReadinessRing } from "@/components/dashboard/readiness-ring";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { NeedsAttention } from "@/components/dashboard/needs-attention";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, needsAttention, profile] = await Promise.all([
    getDashboardStats(),
    getNeedsAttention(),
    getCurrentProfile(),
  ]);

  const rawFirstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
          Kia ora {firstName}, glad you&apos;re here 👋
        </h1>
        <p className="mt-2 text-base text-charcoal/60">Here&apos;s where your ERO self-audit is at.</p>
      </div>

      {stats.criteriaTotal === 0 && (
        <div className="card border-burgundy-100 bg-burgundy-50/60 p-5 text-sm text-burgundy-700">
          The official ERO criteria haven&apos;t been loaded yet, so there&apos;s nothing to score. Once{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">supabase/seed/seed_criteria.sql</code> is
          populated and applied, this dashboard will fill in automatically.
        </div>
      )}

      <section className="card relative overflow-hidden p-8 md:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-pink-50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-yellow-50"
        />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-md flex-col items-center gap-3 text-center md:items-start md:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-burgundy-500">
              Overall ERO Readiness
            </p>
            <p className="text-sm leading-relaxed text-charcoal/60">
              Criteria are counted as ready once both the compliance position and the supporting evidence are
              resolved.
            </p>
          </div>
          <ReadinessRing percent={stats.overallPercent} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">By ERO section</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.sections.map((s, i) => (
            <SectionCard key={s.code} {...s} accent={SECTION_ACCENTS[i % SECTION_ACCENTS.length]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">At a glance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatTile label="Criteria completed" value={stats.criteriaCompleted} tone="ready" />
          <StatTile label="Criteria remaining" value={stats.criteriaRemaining} tone="neutral" />
          <StatTile label="Marked No" value={stats.markedNo} tone="action" />
          <StatTile label="Marked Unsure" value={stats.markedUnsure} tone="attention" />
          <StatTile label="Evidence missing" value={stats.evidenceMissing} tone="action" />
          <StatTile label="Open actions" value={stats.openActions} tone="neutral" />
          <StatTile label="Overdue actions" value={stats.overdueActions} tone="action" />
          <StatTile label="Docs due for review" value={stats.documentsApproachingReview} tone="attention" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-charcoal">Needs Attention</h2>
        <NeedsAttention items={needsAttention} />
      </section>
    </div>
  );
}

const SECTION_ACCENTS = ["pink", "orange", "burgundy", "yellow"] as const;
