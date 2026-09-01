import { CriterionRow } from "./criterion-row";
import { percentage } from "@/lib/utils";
import type { SectionWithCriteria } from "@/lib/types";

export function SectionGroup({ section }: { section: SectionWithCriteria }) {
  const ready = section.criteria.filter(
    (c) =>
      (c.assessment.compliance_status === "yes" || c.assessment.compliance_status === "na") &&
      (c.assessment.evidence_status === "ready" || c.assessment.evidence_status === "not_required")
  ).length;

  return (
    <section id={section.code} className="scroll-mt-24">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-ocean-950">
          <span className="text-ocean-400">{section.code}</span> {section.name}
        </h2>
        <span className="text-xs text-ocean-500">
          {section.criteria.length === 0
            ? "No criteria loaded"
            : `${ready} of ${section.criteria.length} ready (${percentage(ready, section.criteria.length)}%)`}
        </span>
      </div>

      {section.criteria.length === 0 ? (
        <div className="card p-6 text-sm text-ocean-500">
          No criteria have been loaded for this section yet.
        </div>
      ) : (
        <div className="card divide-y divide-ocean-50">
          {section.criteria.map((c) => (
            <CriterionRow key={c.id} criterion={c} />
          ))}
        </div>
      )}
    </section>
  );
}
