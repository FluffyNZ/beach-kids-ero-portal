import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordTabLink } from "@/components/ui/record-shell";
import { STAFF_DOCUMENT_CATEGORY_LABEL, STAFF_QUALIFICATION_STATUS_LABEL } from "@/lib/constants";
import { documentStatus, qualificationLabel } from "@/lib/staff-format";
import { formatDate } from "@/lib/utils";
import type { RequiredDocumentSlot } from "@/lib/staff-required-documents";
import type { StaffDocument, StaffQualification } from "@/lib/types";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

/** Overview's "Qualifications and checks" panel. Required rows come from the
 * existing, status-aware rules (`slots`) so nothing is flagged that this
 * person was never required to have; optional ones (e.g. first aid) only
 * appear when something is on file. */
export function StaffQualificationsSummary({
  role,
  qualification,
  slots,
  otherDocuments,
}: {
  role: string | null;
  qualification: StaffQualification;
  slots: RequiredDocumentSlot[];
  otherDocuments: StaffDocument[];
}) {
  const optionalByCategory = new Map<StaffDocumentCategory, StaffDocument>();
  otherDocuments.forEach((d) => {
    if (!optionalByCategory.has(d.category)) optionalByCategory.set(d.category, d);
  });
  const rows = [
    ...slots.map((s) => ({ category: s.category, newest: s.documents[0] ?? null, required: true })),
    ...Array.from(optionalByCategory.entries()).map(([category, doc]) => ({ category, newest: doc as StaffDocument | null, required: false })),
  ];
  const label = qualificationLabel(role, qualification.qualification_status);

  return (
    <Panel id="panel-qualifications" title="Qualifications and checks" headerAction={<RecordTabLink tab="qualifications">View details</RecordTabLink>}>
      <dl className="divide-y divide-charcoal/10 border-t border-charcoal/10">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
          <dt className="text-charcoal/70">Qualification</dt>
          <dd className="text-right text-charcoal">
            {STAFF_QUALIFICATION_STATUS_LABEL[qualification.qualification_status]}
            {qualification.qualification_level && <span className="text-charcoal/70"> · {qualification.qualification_level}</span>}
            {label?.tone === "attention" && (
              <span className="mt-1 block">
                <StatusPill tone="attention">{label.label}</StatusPill>
              </span>
            )}
          </dd>
        </div>
        {qualification.qualification_status === "qualified" && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
            <dt className="text-charcoal/70">Next review</dt>
            <dd className="text-charcoal">{qualification.next_review_date ? formatDate(qualification.next_review_date) : <span className="text-charcoal/70">Not recorded</span>}</dd>
          </div>
        )}
        {qualification.qualification_status === "studying" && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
            <dt className="text-charcoal/70">Studying</dt>
            <dd className="text-right text-charcoal">
              {qualification.studying_qualification ?? <span className="text-charcoal/70">Not recorded</span>}
              {qualification.expected_completion_date && <span className="text-charcoal/70"> · due {formatDate(qualification.expected_completion_date)}</span>}
            </dd>
          </div>
        )}
        {rows.map(({ category, newest, required }) => {
          const status = newest ? documentStatus(newest.expiry_date) : null;
          return (
            <div key={category} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
              <dt className="text-charcoal">
                {STAFF_DOCUMENT_CATEGORY_LABEL[category]}
                {!required && <span className="text-charcoal/70"> (optional)</span>}
              </dt>
              <dd>
                {!newest ? (
                  <StatusPill tone="action">Missing</StatusPill>
                ) : (
                  <StatusPill tone={status!.tone}>{status!.label}</StatusPill>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </Panel>
  );
}
