import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon, FlagIcon } from "@/components/icons";
import { COMPLIANCE_LABEL, EVIDENCE_STATUS_LABEL, complianceTone, evidenceTone } from "@/lib/constants";
import type { CriterionWithAssessment } from "@/lib/types";

export function CriterionRow({ criterion }: { criterion: CriterionWithAssessment }) {
  const isNotApplicable = criterion.assessment.compliance_status === "na";

  return (
    <Link
      href={`/checklist/${criterion.code}`}
      className={`flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ocean-50/60 ${
        isNotApplicable ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-medium text-ocean-950 ${isNotApplicable ? "line-through" : ""}`}>
          <span className="text-ocean-500">{criterion.code}</span> — {criterion.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-ocean-500">{criterion.official_requirement}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {criterion.assessment.is_flagged && (
          <StatusBadge tone="action">
            <FlagIcon className="h-3.5 w-3.5" />
            Flagged
          </StatusBadge>
        )}
        <StatusBadge tone={complianceTone(criterion.assessment.compliance_status)}>
          {COMPLIANCE_LABEL[criterion.assessment.compliance_status]}
        </StatusBadge>
        <StatusBadge tone={evidenceTone(criterion.assessment.evidence_status)} className="hidden sm:inline-flex">
          {EVIDENCE_STATUS_LABEL[criterion.assessment.evidence_status]}
        </StatusBadge>
        <ChevronRightIcon className="h-4 w-4 text-ocean-300" />
      </div>
    </Link>
  );
}
