import Link from "next/link";
import { getSectionsWithCriteria, getFlaggedCriteriaCount } from "@/lib/data/checklist";
import { getDashboardStats } from "@/lib/data/dashboard";
import { SectionGroup } from "@/components/checklist/section-group";
import { ChecklistSearchBar } from "@/components/checklist/checklist-search-bar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ReadinessRing } from "@/components/dashboard/readiness-ring";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: { q?: string; section?: string; flagged?: string };
}) {
  const flaggedOnly = searchParams.flagged === "true";
  const [sections, flaggedCount, stats] = await Promise.all([
    getSectionsWithCriteria({ search: searchParams.q, section: searchParams.section, flaggedOnly }),
    getFlaggedCriteriaCount(),
    getDashboardStats(),
  ]);
  const isFiltered = Boolean(searchParams.q || searchParams.section || flaggedOnly);
  const visibleSections = isFiltered ? sections.filter((s) => s.criteria.length > 0) : sections;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">ERO Checklist</h1>
        <p className="mt-1 text-sm text-ocean-500">
          The official ERO self-audit structure, grouped by section. Open a criterion to record its status,
          evidence and actions.
        </p>
      </div>

      {/* Moved here from the old ERO dashboard, now that /dashboard is the
          general Home screen — same data (getDashboardStats), same
          components, just relocated so nothing is lost. Left in its
          Phase-1 (charcoal/neutral) styling rather than reworked to match
          this page's not-yet-restyled ocean-* look, since restyling the
          rest of this page is a separate, later step. */}
      <section className="card flex flex-col items-center gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="flex w-full max-w-md flex-col items-center gap-3 text-center md:w-auto md:items-start md:text-left">
          <span className="badge bg-burgundy-50 text-burgundy-600">Overall ERO Readiness</span>
          <p className="text-sm leading-relaxed text-charcoal/60">
            Criteria are counted as ready once both the compliance position and the supporting evidence are
            resolved.
          </p>
        </div>
        <ReadinessRing percent={stats.overallPercent} />
      </section>

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

      <Link
        href={flaggedOnly ? "/checklist" : "/checklist?flagged=true"}
        className="block rounded-2xl transition hover:shadow-cardHover sm:w-56"
        title={flaggedOnly ? "Show all criteria" : "View flagged criteria"}
      >
        <StatTile label={flaggedOnly ? "Flagged (showing — click to clear)" : "Flagged"} value={flaggedCount} tone="action" />
      </Link>

      <ChecklistSearchBar />

      {isFiltered && visibleSections.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ocean-500">
          {flaggedOnly
            ? "Nothing is currently flagged."
            : "No criteria match your search. Try a different word, or clear the section filter."}
        </div>
      ) : (
        visibleSections.map((section) => <SectionGroup key={section.id} section={section} />)
      )}
    </div>
  );
}
