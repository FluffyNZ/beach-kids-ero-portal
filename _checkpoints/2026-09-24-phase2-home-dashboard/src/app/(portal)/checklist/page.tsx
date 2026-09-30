import Link from "next/link";
import { getSectionsWithCriteria, getFlaggedCriteriaCount } from "@/lib/data/checklist";
import { SectionGroup } from "@/components/checklist/section-group";
import { ChecklistSearchBar } from "@/components/checklist/checklist-search-bar";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: { q?: string; section?: string; flagged?: string };
}) {
  const flaggedOnly = searchParams.flagged === "true";
  const [sections, flaggedCount] = await Promise.all([
    getSectionsWithCriteria({ search: searchParams.q, section: searchParams.section, flaggedOnly }),
    getFlaggedCriteriaCount(),
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
