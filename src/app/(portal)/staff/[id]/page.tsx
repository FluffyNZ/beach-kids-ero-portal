import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffById } from "@/lib/data/staff";
import { updateStaffDetails, setStaffStatus, uploadStaffDocument, updateStaffQualification } from "@/lib/actions/staff";
import { StaffDetailsForm } from "@/components/staff/staff-details-form";
import { StaffProfileForm } from "@/components/staff/staff-profile-form";
import { RequiredDocumentsPanel } from "@/components/staff/required-documents-panel";
import { StaffQualificationForm } from "@/components/staff/staff-qualification-form";
import { DeleteStaffButton } from "@/components/staff/delete-staff-button";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import {
  STAFF_STATUS_LABEL,
  STAFF_CONTRACT_TYPE_LABEL,
  STAFF_CONTRACT_TYPE_BADGE,
  STAFF_QUALIFICATION_STATUS_LABEL,
  staffQualificationTone,
} from "@/lib/constants";
import { getRequiredDocumentSlots, getOtherDocuments } from "@/lib/staff-required-documents";
import { formatDate, formatCurrency, percentage } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const staffMember = await getStaffById(params.id);
  if (!staffMember) notFound();

  const checklistPercent = percentage(staffMember.required_docs_completed, staffMember.required_docs_total);
  const requiredDocumentSlots = getRequiredDocumentSlots(
    staffMember.qualification.qualification_status,
    staffMember.documents
  );
  const otherDocuments = getOtherDocuments(staffMember.qualification.qualification_status, staffMember.documents);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/staff" className="hover:text-charcoal">
          Staff
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{staffMember.full_name}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">{staffMember.full_name}</h1>
            <StatusBadge tone={staffMember.status === "active" ? "ready" : "neutral"}>
              {STAFF_STATUS_LABEL[staffMember.status]}
            </StatusBadge>
            {staffMember.contract_type && (
              <span className={`badge ${STAFF_CONTRACT_TYPE_BADGE[staffMember.contract_type]}`}>
                {STAFF_CONTRACT_TYPE_LABEL[staffMember.contract_type]}
              </span>
            )}
            <StatusBadge tone={checklistPercent === 100 ? "ready" : checklistPercent === 0 ? "action" : "attention"}>
              Profile {checklistPercent}% complete
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-charcoal/60">
            {staffMember.role ?? "Role not set"}
            {staffMember.start_date ? ` · started ${formatDate(staffMember.start_date)}` : ""}
            {staffMember.pay_rate !== null ? ` · ${formatCurrency(staffMember.pay_rate)}/hr` : ""}
            {staffMember.min_hours !== null ? ` · min ${staffMember.min_hours} hrs/week` : ""}
          </p>
        </div>
        <form
          action={setStaffStatus.bind(null, staffMember.id, staffMember.status === "active" ? "former" : "active")}
        >
          <button type="submit" className="btn-ghost">
            {staffMember.status === "active" ? "Mark as former staff" : "Mark as active"}
          </button>
        </form>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Staff details</h2>
        <StaffDetailsForm
          fullName={staffMember.full_name}
          role={staffMember.role}
          startDate={staffMember.start_date}
          endDate={staffMember.end_date}
          contractType={staffMember.contract_type}
          payRate={staffMember.pay_rate}
          minHours={staffMember.min_hours}
          onSave={updateStaffDetails.bind(null, staffMember.id)}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Staff Profile</h2>
        <StaffProfileForm notes={staffMember.notes} onSave={updateStaffDetails.bind(null, staffMember.id)} />
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            Qualifications &amp; pay parity
          </h2>
          <StatusBadge tone={staffQualificationTone(staffMember.qualification.qualification_status)}>
            {STAFF_QUALIFICATION_STATUS_LABEL[staffMember.qualification.qualification_status]}
          </StatusBadge>
        </div>
        <StaffQualificationForm
          qualification={staffMember.qualification}
          onSave={updateStaffQualification.bind(null, staffMember.id)}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Required Documents</h2>
        <RequiredDocumentsPanel
          slots={requiredDocumentSlots}
          otherDocuments={otherDocuments}
          onUpload={uploadStaffDocument.bind(null, staffMember.id)}
        />
      </section>

      <section className="card border-status-action/20 p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-status-action">Danger zone</h2>
        <p className="mb-3 text-sm text-charcoal/60">
          Permanently remove this person&apos;s profile and everything filed against it.
        </p>
        <DeleteStaffButton staffId={staffMember.id} fullName={staffMember.full_name} />
      </section>
    </div>
  );
}
