import Link from "next/link";
import { notFound } from "next/navigation";
import { getCriterionByCode } from "@/lib/data/checklist";
import { getEvidenceForCriterion, getEvidenceList } from "@/lib/data/evidence";
import { getActionsForCriterion } from "@/lib/data/actions";
import { StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/checklist/status-select";
import { NotesField } from "@/components/checklist/notes-field";
import { FlagPanel } from "@/components/checklist/flag-panel";
import { EvidencePanel } from "@/components/checklist/evidence-panel";
import { EvidenceGuidancePanel } from "@/components/checklist/evidence-guidance-panel";
import { ActionsPanel } from "@/components/checklist/actions-panel";
import { ReviewInfoPanel } from "@/components/checklist/review-info-panel";
import { ChevronRightIcon, FlagIcon } from "@/components/icons";
import { CURRICULUM_EVIDENCE_GUIDANCE } from "@/lib/evidence-guidance";
import {
  COMPLIANCE_LABEL,
  EVIDENCE_STATUS_LABEL,
  complianceTone,
  evidenceTone,
} from "@/lib/constants";
import {
  updateComplianceStatus,
  updateEvidenceStatus,
  updateManagementNotes,
  updateFlag,
  updateReviewInfo,
} from "@/lib/actions/criteria";
import { formatDateTime } from "@/lib/utils";
import type { ComplianceStatus, EvidenceStatusValue } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function CriterionDetailPage({ params }: { params: { code: string } }) {
  const result = await getCriterionByCode(params.code.toUpperCase());
  if (!result) notFound();

  const { criterion, section } = result;
  const evidenceGuidance = CURRICULUM_EVIDENCE_GUIDANCE[criterion.code];

  const [linkedEvidence, libraryEvidence, actions] = await Promise.all([
    getEvidenceForCriterion(criterion.id),
    getEvidenceList(),
    getActionsForCriterion(criterion.id),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-ocean-500">
        <Link href="/checklist" className="hover:text-ocean-700">
          ERO Checklist
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <Link href={`/checklist#${section.code}`} className="hover:text-ocean-700">
          {section.name}
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-ocean-800">{criterion.code}</span>
      </nav>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={`font-display text-2xl font-semibold text-ocean-950 md:text-3xl ${
              criterion.assessment.compliance_status === "na" ? "line-through opacity-60" : ""
            }`}
          >
            {criterion.code} — {criterion.title}
          </h1>
          {criterion.assessment.compliance_status === "na" && (
            <StatusBadge tone="neutral">Does not apply to this service</StatusBadge>
          )}
          {criterion.assessment.is_flagged && (
            <StatusBadge tone="action">
              <FlagIcon className="h-3.5 w-3.5" />
              Flagged
            </StatusBadge>
          )}
        </div>
        {criterion.assessment.updated_at && (
          <p className="mt-1 text-xs text-ocean-400">Last updated {formatDateTime(criterion.assessment.updated_at)}</p>
        )}
      </div>

      <section className="card p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-500">
          Official ERO Requirement
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ocean-900">
          {criterion.official_requirement}
        </p>
        {criterion.source_reference && (
          <p className="mt-2 text-xs text-ocean-400">Source: {criterion.source_reference}</p>
        )}
      </section>

      {evidenceGuidance && <EvidenceGuidancePanel guidance={evidenceGuidance} />}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-500">Compliance Status</h2>
          <StatusSelect<ComplianceStatus>
            value={criterion.assessment.compliance_status}
            options={(Object.keys(COMPLIANCE_LABEL) as ComplianceStatus[]).map((v) => ({
              value: v,
              label: COMPLIANCE_LABEL[v],
            }))}
            onChange={updateComplianceStatus.bind(null, criterion.id, criterion.code)}
          />
          <div className="mt-2">
            <StatusBadge tone={complianceTone(criterion.assessment.compliance_status)}>
              {COMPLIANCE_LABEL[criterion.assessment.compliance_status]}
            </StatusBadge>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-500">Evidence Status</h2>
          <StatusSelect<EvidenceStatusValue>
            value={criterion.assessment.evidence_status}
            options={(Object.keys(EVIDENCE_STATUS_LABEL) as EvidenceStatusValue[]).map((v) => ({
              value: v,
              label: EVIDENCE_STATUS_LABEL[v],
            }))}
            onChange={updateEvidenceStatus.bind(null, criterion.id, criterion.code)}
          />
          <div className="mt-2">
            <StatusBadge tone={evidenceTone(criterion.assessment.evidence_status)}>
              {EVIDENCE_STATUS_LABEL[criterion.assessment.evidence_status]}
            </StatusBadge>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-500">Evidence</h2>
        <EvidencePanel
          criterionId={criterion.id}
          criterionCode={criterion.code}
          linkedEvidence={linkedEvidence}
          libraryEvidence={libraryEvidence}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-500">Flag</h2>
        <FlagPanel
          criterionId={criterion.id}
          criterionCode={criterion.code}
          isFlagged={criterion.assessment.is_flagged}
          flagNotes={criterion.assessment.flag_notes}
          onSave={updateFlag}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-500">Management Notes</h2>
        <NotesField
          initialValue={criterion.assessment.management_notes ?? ""}
          onSave={updateManagementNotes.bind(null, criterion.id, criterion.code)}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-500">Actions Required</h2>
        <ActionsPanel criterionId={criterion.id} criterionCode={criterion.code} actions={actions} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-500">Review Information</h2>
        <ReviewInfoPanel
          criterionId={criterion.id}
          criterionCode={criterion.code}
          lastReviewedAt={criterion.assessment.last_reviewed_at}
          nextReviewDate={criterion.assessment.next_review_date}
          reviewedByName={criterion.assessment.reviewed_by_name}
          onSave={updateReviewInfo}
        />
      </section>
    </div>
  );
}
