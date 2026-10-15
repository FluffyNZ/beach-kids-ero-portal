import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffById } from "@/lib/data/staff";
import { getRosterRooms } from "@/lib/data/roster";
import { getStaffInduction } from "@/lib/data/induction";
import { getStaffInductionTotalItemCount } from "@/lib/staff-induction-checklist";
import {
  updateStaffDetails,
  setStaffStatus,
  recordStaffDocumentUpload,
  deleteStaffDocument,
  updateStaffQualification,
  updateStaffAvailability,
} from "@/lib/actions/staff";
import { StaffAvatar } from "@/components/staff/staff-avatar";
import { StaffPhotoUpload } from "@/components/staff/staff-photo-upload";
import { StaffContactSection } from "@/components/staff/staff-contact-section";
import { StaffAvailabilitySection } from "@/components/staff/staff-availability-section";
import { StaffDocumentsSummary } from "@/components/staff/staff-documents-summary";
import { StaffQualificationsSummary } from "@/components/staff/staff-qualifications-summary";
import { StaffGrowthSummary } from "@/components/staff/staff-growth-summary";
import { StaffEmploymentForm } from "@/components/staff/staff-employment-form";
import { StaffQualificationForm } from "@/components/staff/staff-qualification-form";
import { RequiredDocumentsPanel } from "@/components/staff/required-documents-panel";
import { StaffGrowthPanel } from "@/components/staff/staff-growth-panel";
import { StaffNotesPanel } from "@/components/staff/staff-notes-panel";
import { LearningStoryPermissionToggle } from "@/components/staff/learning-story-permission-toggle";
import { EmailStaffButton } from "@/components/staff/email-staff-button";
import { DeleteStaffButton } from "@/components/staff/delete-staff-button";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { ChevronRightIcon } from "@/components/icons";
import {
  STAFF_STATUS_LABEL,
  STAFF_CONTRACT_TYPE_LABEL,
  STAFF_CONTRACT_TYPE_BADGE,
  STAFF_QUALIFICATION_STATUS_LABEL,
  STAFF_DOCUMENT_CATEGORY_LABEL,
  STAFF_QUALIFICATION_TAB_DOCUMENT_CATEGORIES,
  WEEKDAYS,
  staffQualificationTone,
} from "@/lib/constants";
import { getRequiredDocumentSlots, getOtherDocuments } from "@/lib/staff-required-documents";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { formatDate, percentage } from "@/lib/utils";
import type { StaffAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

const TAB_KEYS = ["overview", "employment", "qualifications", "documents", "growth", "notes"] as const;

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const [staffMember, rooms] = await Promise.all([getStaffById(params.id), getRosterRooms()]);
  if (!staffMember) notFound();

  const checklistPercent = percentage(staffMember.required_docs_completed, staffMember.required_docs_total);
  const requiredDocumentSlots = getRequiredDocumentSlots(
    staffMember.qualification.qualification_status,
    staffMember.documents,
    staffMember.contract_type
  );
  const otherDocuments = getOtherDocuments(
    staffMember.qualification.qualification_status,
    staffMember.documents,
    staffMember.contract_type
  );

  // Split the same two lists each tab needs between Qualifications
  // (teaching qualification, practising certificate/registration, first
  // aid, safety checking) and Documents (contracts, certificates and
  // everything else) — see the constant's own comment for why this is
  // derived rather than a second fixed list.
  const isQualTabCategory = (c: string) => (STAFF_QUALIFICATION_TAB_DOCUMENT_CATEGORIES as string[]).includes(c);
  const qualificationSlots = requiredDocumentSlots.filter((s) => isQualTabCategory(s.category));
  const qualificationOtherDocs = otherDocuments.filter((d) => isQualTabCategory(d.category));
  const documentsTabSlots = requiredDocumentSlots.filter((s) => !isQualTabCategory(s.category));
  const documentsTabOtherDocs = otherDocuments.filter((d) => !isQualTabCategory(d.category));

  const induction = await getStaffInduction(staffMember.id);
  const inductionTotal = getStaffInductionTotalItemCount();
  const inductionChecked = induction.checkedItemKeys.size;
  const inductionPercent = inductionTotal > 0 ? Math.round((inductionChecked / inductionTotal) * 100) : 0;

  const accessLevel = staffMember.accessLevel;
  const defaultTab = TAB_KEYS.includes(searchParams.tab as (typeof TAB_KEYS)[number])
    ? (searchParams.tab as (typeof TAB_KEYS)[number])
    : "overview";

  // "Upcoming renewals" (Overview tab) — the qualification review date plus
  // every document that has an expiry date on file, whichever are inside
  // getDeadlineAlert's window. Only ever built from real saved dates.
  const renewalItems: Array<{ label: string; alert: NonNullable<ReturnType<typeof getDeadlineAlert>> }> = [];
  const qualAlert = getDeadlineAlert(staffMember.qualification.next_review_date, null);
  if (qualAlert) renewalItems.push({ label: "Qualification / registration review", alert: qualAlert });
  staffMember.documents.forEach((d) => {
    const alert = getDeadlineAlert(null, d.expiry_date);
    if (alert) renewalItems.push({ label: STAFF_DOCUMENT_CATEGORY_LABEL[d.category], alert });
  });
  renewalItems.sort((a, b) => a.alert.days - b.alert.days);

  const availability = staffMember.availability;
  const availabilityDaysCount = availability
    ? WEEKDAYS.filter((d) => {
        const start = availability[`${d.key}_start` as keyof StaffAvailability];
        const end = availability[`${d.key}_end` as keyof StaffAvailability];
        return Boolean(start && end);
      }).length
    : 0;

  // Compact summary strip + two-column dashboard layout, per the Overview
  // redesign brief: Room/Employment/Available days/Contracted hours up top,
  // then Left = Personal & contact / Weekly availability / Recent
  // documents, Right = Qualifications & checks / Upcoming renewals /
  // Professional growth. Every card here either reads real saved data
  // straight off staffMember (showing "Not recorded" when it's missing) or
  // links through to the full tab — nothing here is a second source of
  // truth for anything editable.
  const overviewContent = (
    <div className="flex flex-col gap-5">
      <section className="card grid grid-cols-2 divide-charcoal/5 p-5 sm:grid-cols-4 sm:divide-x">
        <div className="pr-4 sm:pl-0">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Room</p>
          <p className="mt-0.5 text-sm font-medium text-charcoal">{staffMember.room_name ?? "Not recorded"}</p>
        </div>
        <div className="pl-4 pr-4 sm:pl-6">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Employment</p>
          <p className="mt-0.5 text-sm font-medium text-charcoal">
            {staffMember.contract_type ? STAFF_CONTRACT_TYPE_LABEL[staffMember.contract_type] : "Not recorded"}
          </p>
        </div>
        <div className="pr-4 pt-4 sm:pl-6 sm:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Available days</p>
          <p className="mt-0.5 text-sm font-medium text-charcoal">
            {availabilityDaysCount > 0 ? `${availabilityDaysCount} day${availabilityDaysCount === 1 ? "" : "s"}/week` : "Not recorded"}
          </p>
        </div>
        <div className="pl-4 pt-4 sm:pl-6 sm:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Contracted hours</p>
          <p className="mt-0.5 text-sm font-medium text-charcoal">
            {staffMember.min_hours !== null ? `${staffMember.min_hours} hrs/week` : "Not recorded"}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <StaffContactSection
            staffId={staffMember.id}
            email={staffMember.email}
            mobilePhone={staffMember.mobile_phone}
            dateOfBirth={staffMember.date_of_birth}
            emergencyContactName={staffMember.emergency_contact_name}
            emergencyContactPhone={staffMember.emergency_contact_phone}
            emergencyContactRelationship={staffMember.emergency_contact_relationship}
            notes={staffMember.notes}
            onSave={updateStaffDetails.bind(null, staffMember.id)}
          />
          <StaffAvailabilitySection
            availability={staffMember.availability}
            onSave={updateStaffAvailability.bind(null, staffMember.id)}
          />
          <StaffDocumentsSummary staffId={staffMember.id} documents={staffMember.documents} />
        </div>

        <div className="flex flex-col gap-5">
          <StaffQualificationsSummary
            staffId={staffMember.id}
            slots={qualificationSlots}
            otherDocuments={qualificationOtherDocs}
          />

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Upcoming renewals</h2>
            {renewalItems.length === 0 ? (
              <p className="text-sm text-charcoal/50">Nothing due for renewal right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {renewalItems.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-charcoal/10 px-3 py-2">
                    <span className="text-sm text-charcoal">{item.label}</span>
                    <StatusBadge tone={item.alert.tone}>{item.alert.label}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <StaffGrowthSummary staffId={staffMember.id} cycles={staffMember.growthCycles} />
        </div>
      </div>
    </div>
  );

  const employmentContent = (
    <div className="flex flex-col gap-5">
      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Photo</h2>
        <StaffPhotoUpload staffId={staffMember.id} fullName={staffMember.full_name} photoUrl={staffMember.photo_url} />
      </section>

      <section className="card p-5">
        <StaffEmploymentForm
          fullName={staffMember.full_name}
          role={staffMember.role}
          startDate={staffMember.start_date}
          endDate={staffMember.end_date}
          contractType={staffMember.contract_type}
          payRate={staffMember.pay_rate}
          minHours={staffMember.min_hours}
          roomId={staffMember.room_id}
          rooms={rooms}
          accessLevel={accessLevel}
          onSave={updateStaffDetails.bind(null, staffMember.id)}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Pay parity &amp; recognised service <span className="text-charcoal/40">— restricted</span>
        </h2>
        {accessLevel === "full" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Pay parity step</p>
              <p className="mt-0.5 text-sm text-charcoal">{staffMember.qualification.pay_parity_step ?? "Not recorded"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Recognised service</p>
              <p className="mt-0.5 text-sm text-charcoal">{staffMember.qualification.recognised_service ?? "Not recorded"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-charcoal/40">Restricted — authorised management only.</p>
        )}
        <p className="mt-3 text-xs text-charcoal/40">Edited from the Qualifications tab.</p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Induction</h2>
        <div className="mb-3 flex items-center gap-2">
          {induction.completed_at ? (
            <StatusBadge tone="ready">Complete</StatusBadge>
          ) : inductionChecked > 0 ? (
            <StatusBadge tone="attention">In progress</StatusBadge>
          ) : (
            <StatusBadge tone="action">Not started</StatusBadge>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-charcoal/60">
              {inductionChecked} of {inductionTotal} items ticked ({inductionPercent}%)
              {induction.staff_signed_at && ` · signed ${formatDate(induction.staff_signed_at)}`}
            </p>
            <p className="mt-0.5 text-xs text-charcoal/40">
              The digital Induction Pack for Kaiako — policies, forms and health &amp; safety, with a signature at
              the end.
            </p>
          </div>
          <Link href={`/staff/${staffMember.id}/induction`} className="btn-secondary">
            {inductionChecked > 0 ? "Continue induction" : "Start induction"}
          </Link>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Learning Stories</h2>
        <LearningStoryPermissionToggle
          staffId={staffMember.id}
          canPublishDirectly={staffMember.can_publish_learning_stories}
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

  const qualificationsContent = (
    <div className="flex flex-col gap-5">
      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Qualifications &amp; pay parity</h2>
          <StatusBadge tone={staffQualificationTone(staffMember.qualification.qualification_status)}>
            {STAFF_QUALIFICATION_STATUS_LABEL[staffMember.qualification.qualification_status]}
          </StatusBadge>
        </div>
        <StaffQualificationForm
          qualification={staffMember.qualification}
          accessLevel={accessLevel}
          onSave={updateStaffQualification.bind(null, staffMember.id)}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Teaching qualification, practising certificate &amp; first aid records
        </h2>
        <RequiredDocumentsPanel
          slots={qualificationSlots}
          otherDocuments={qualificationOtherDocs}
          onUpload={recordStaffDocumentUpload.bind(null, staffMember.id)}
          onDelete={deleteStaffDocument.bind(null, staffMember.id)}
        />
      </section>
    </div>
  );

  const documentsContent = (
    <section className="card p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Documents</h2>
      {accessLevel !== "full" && (
        <p className="mb-3 rounded-lg bg-charcoal/[0.03] px-3 py-2 text-xs text-charcoal/50">
          Contracts are restricted to authorised management — any on file for this person aren&apos;t shown here to
          your account.
        </p>
      )}
      <RequiredDocumentsPanel
        slots={documentsTabSlots}
        otherDocuments={documentsTabOtherDocs}
        onUpload={recordStaffDocumentUpload.bind(null, staffMember.id)}
        onDelete={deleteStaffDocument.bind(null, staffMember.id)}
      />
    </section>
  );

  const growthContent = <StaffGrowthPanel staffId={staffMember.id} cycles={staffMember.growthCycles} />;

  const notesContent = <StaffNotesPanel staffId={staffMember.id} notes={staffMember.notes_log} accessLevel={accessLevel} />;

  const tabs: TabItem[] = [
    { key: "overview", label: "Overview", content: overviewContent },
    { key: "employment", label: "Employment", content: employmentContent },
    { key: "qualifications", label: "Qualifications", content: qualificationsContent },
    { key: "documents", label: "Documents", content: documentsContent, count: documentsTabSlots.length + documentsTabOtherDocs.length },
    { key: "growth", label: "Professional growth", content: growthContent, count: staffMember.growthCycles.length || undefined },
    { key: "notes", label: "Notes", content: notesContent, count: accessLevel === "full" ? staffMember.notes_log.length || undefined : undefined },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/staff" className="hover:text-charcoal">
          Staff
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{staffMember.full_name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <StaffAvatar fullName={staffMember.full_name} photoUrl={staffMember.photo_url} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
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
              {staffMember.room_name ? ` · ${staffMember.room_name}` : ""}
              {staffMember.start_date ? ` · started ${formatDate(staffMember.start_date)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <EmailStaffButton staffId={staffMember.id} />
          <Link href={`/staff/${staffMember.id}?tab=employment`} className="btn-secondary">
            Edit profile
          </Link>
          <form
            action={setStaffStatus.bind(null, staffMember.id, staffMember.status === "active" ? "former" : "active")}
          >
            <button type="submit" className="btn-ghost">
              {staffMember.status === "active" ? "Mark as former staff" : "Mark as active"}
            </button>
          </form>
        </div>
      </div>

      {/* key={defaultTab} forces a remount when the ?tab= query param changes
          (e.g. clicking "Edit profile", which links to ?tab=employment) —
          Tabs only reads its defaultTab prop once via useState on mount, so
          without this, navigating to a new ?tab= while already on this page
          would silently leave the previously-active tab showing. */}
      <Tabs key={defaultTab} tabs={tabs} defaultTab={defaultTab} />

      <p className="pb-2 text-center text-xs text-charcoal/35">
        Pay, contracts and confidential notes are restricted to authorised management.
      </p>
    </div>
  );
}
