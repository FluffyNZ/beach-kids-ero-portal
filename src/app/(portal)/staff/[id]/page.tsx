import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffById } from "@/lib/data/staff";
import { getRosterRooms, getRosterWeekByStartDate } from "@/lib/data/roster";
import { getStaffInduction } from "@/lib/data/induction";
import { getStaffInductionTotalItemCount } from "@/lib/staff-induction-checklist";
import {
  updateStaffDetails,
  recordStaffDocumentUpload,
  deleteStaffDocument,
  updateStaffQualification,
  updateStaffAvailability,
} from "@/lib/actions/staff";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordShell, RecordTabs, RecordEditButton } from "@/components/ui/record-shell";
import { StaffAvatar } from "@/components/staff/staff-avatar";
import { StaffEditDrawer } from "@/components/staff/staff-edit-drawer";
import { StaffActionsMenu } from "@/components/staff/staff-actions-menu";
import { StaffEmploymentPanel, StaffContactPanel, StaffRenewalsPanel, type RenewalItem } from "@/components/staff/staff-overview";
import { StaffAvailabilitySection } from "@/components/staff/staff-availability-section";
import { StaffDocumentsSummary } from "@/components/staff/staff-documents-summary";
import { StaffQualificationsSummary } from "@/components/staff/staff-qualifications-summary";
import { StaffGrowthSummary } from "@/components/staff/staff-growth-summary";
import { StaffQualificationForm } from "@/components/staff/staff-qualification-form";
import { RequiredDocumentsPanel } from "@/components/staff/required-documents-panel";
import { StaffGrowthPanel } from "@/components/staff/staff-growth-panel";
import { StaffNotesPanel } from "@/components/staff/staff-notes-panel";
import { ChevronRightIcon, EditIcon, LinkIcon, MailIcon } from "@/components/icons";
import {
  STAFF_CONTRACT_TYPE_LABEL,
  STAFF_DOCUMENT_CATEGORY_LABEL,
  STAFF_QUALIFICATION_TAB_DOCUMENT_CATEGORIES,
} from "@/lib/constants";
import { getRequiredDocumentSlots, getOtherDocuments } from "@/lib/staff-required-documents";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { alertWords, documentStatus, hoursBetweenTimes } from "@/lib/staff-format";
import { formatNzDate } from "@/lib/child-format";
import { formatDate, mondayOfDateString, nzTodayDateString, teachingCouncilSearchUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TAB_KEYS = ["overview", "employment", "qualifications", "documents", "growth", "notes"];

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const [staff, rooms] = await Promise.all([getStaffById(params.id), getRosterRooms()]);
  if (!staff) notFound();

  const rosterWeekStart = mondayOfDateString(nzTodayDateString());
  const [induction, rosterWeek] = await Promise.all([getStaffInduction(staff.id), getRosterWeekByStartDate(rosterWeekStart)]);

  const accessLevel = staff.accessLevel;
  const firstName = staff.full_name.trim().split(/\s+/)[0];

  // Required vs other documents — the existing rules, split between the
  // Qualifications tab (qualification/registration, first aid) and the
  // Documents tab (everything else).
  // Contracts aren't sent to a restricted viewer at all (see getStaffById),
  // so for them the contract slot is left out rather than shown as
  // "Missing" when it may well be on file.
  const requiredSlots = getRequiredDocumentSlots(
    staff.qualification.qualification_status,
    staff.documents,
    staff.contract_type
  ).filter((s) => accessLevel === "full" || s.category !== "contract");
  const otherDocuments = getOtherDocuments(staff.qualification.qualification_status, staff.documents, staff.contract_type);
  const isQualTab = (c: string) => (STAFF_QUALIFICATION_TAB_DOCUMENT_CATEGORIES as string[]).includes(c);
  const qualificationSlots = requiredSlots.filter((s) => isQualTab(s.category));
  const qualificationOtherDocs = otherDocuments.filter((d) => isQualTab(d.category));
  const documentsSlots = requiredSlots.filter((s) => !isQualTab(s.category));
  const documentsOtherDocs = otherDocuments.filter((d) => !isQualTab(d.category));
  const missingRequired = requiredSlots.filter((s) => s.documents.length === 0).length;

  // Rostered hours this week (NZ week): start-to-finish of each of this
  // person's shifts. null = no roster entered for the week.
  const rosteredHours = rosterWeek
    ? rosterWeek.shifts.filter((s) => s.staff_id === staff.id).reduce((sum, s) => sum + hoursBetweenTimes(s.start_time, s.end_time), 0)
    : null;

  // Upcoming renewals — qualification review date and document expiries
  // inside the existing 90-day window (getDeadlineAlert).
  const renewals: (RenewalItem & { days: number })[] = [];
  const reviewAlert = getDeadlineAlert(staff.qualification.next_review_date, null);
  if (reviewAlert) renewals.push({ label: "Qualification / registration review", when: alertWords(reviewAlert), tone: reviewAlert.tone, days: reviewAlert.days });
  staff.documents.forEach((d) => {
    const alert = getDeadlineAlert(null, d.expiry_date);
    if (alert) {
      const status = documentStatus(d.expiry_date);
      renewals.push({ label: STAFF_DOCUMENT_CATEGORY_LABEL[d.category], when: status.label, tone: status.tone, days: alert.days });
    }
  });
  renewals.sort((a, b) => a.days - b.days);

  const inductionTotal = getStaffInductionTotalItemCount();
  const inductionChecked = induction.checkedItemKeys.size;

  const overview = (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <StaffEmploymentPanel staff={staff} rosteredHours={rosteredHours} rosterWeekStart={rosterWeekStart} />
        <StaffContactPanel staff={staff} />
        <StaffAvailabilitySection availability={staff.availability} onSave={updateStaffAvailability.bind(null, staff.id)} />
      </div>
      <div className="flex flex-col gap-5">
        <StaffQualificationsSummary
          role={staff.role}
          qualification={staff.qualification}
          slots={qualificationSlots}
          otherDocuments={qualificationOtherDocs}
        />
        <StaffRenewalsPanel items={renewals} />
        <StaffDocumentsSummary documents={staff.documents} missingRequired={missingRequired} />
        <StaffGrowthSummary cycles={staff.growthCycles} />
      </div>
    </div>
  );

  const employment = (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <StaffEmploymentPanel staff={staff} rosteredHours={rosteredHours} rosterWeekStart={rosterWeekStart} />
      <div className="flex flex-col gap-5">
        <Panel
          id="panel-pay"
          title="Pay and pay parity"
          description="Restricted to authorised management"
          bodyClassName="border-t border-charcoal/10"
        >
          {accessLevel === "full" ? (
            <dl className="divide-y divide-charcoal/10">
              {[
                ["Pay rate", staff.pay_rate !== null ? `$${staff.pay_rate.toFixed(2)} an hour` : null, "Edit profile"],
                ["Tax code", staff.tax_code, "Edit profile"],
                ["Pay parity step", staff.qualification.pay_parity_step, "Qualifications tab"],
                ["Recognised service", staff.qualification.recognised_service, "Qualifications tab"],
              ].map(([label, value, where]) => (
                <div key={label as string} className="grid grid-cols-[9rem_1fr] gap-3 px-5 py-2.5 text-sm sm:grid-cols-[11rem_1fr]">
                  <dt className="text-charcoal/70">{label}</dt>
                  <dd className="text-charcoal">
                    {value ?? <span className="text-charcoal/70">Not recorded</span>}
                    <span className="block text-xs text-charcoal/60">Edited in {where}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="px-5 py-4 text-sm text-charcoal/70">
              Pay, pay parity and recognised service are only shown to authorised management.
            </p>
          )}
        </Panel>

        <Panel id="panel-induction" title="Induction" bodyClassName="border-t border-charcoal/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {induction.completed_at ? (
                <StatusPill tone="ready">Complete</StatusPill>
              ) : inductionChecked > 0 ? (
                <StatusPill tone="attention">In progress</StatusPill>
              ) : (
                <StatusPill tone="neutral">Not started</StatusPill>
              )}
              <p className="mt-1.5 text-sm text-charcoal">
                {inductionChecked} of {inductionTotal} items ticked
                {induction.staff_signed_at && <span className="text-charcoal/70"> · signed {formatNzDate(induction.staff_signed_at)}</span>}
              </p>
              <p className="mt-0.5 text-xs text-charcoal/70">The Induction Pack for Kaiako — policies, forms and health and safety, signed at the end.</p>
            </div>
            <Link href={`/staff/${staff.id}/induction`} className="btn-secondary">
              {inductionChecked > 0 ? "Continue induction" : "Start induction"}
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );

  const qualifications = (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="flex flex-col gap-5">
        <Panel id="panel-qualification" title="Qualification and pay parity" bodyClassName="border-t border-charcoal/10 px-5 py-5">
          <StaffQualificationForm
            qualification={staff.qualification}
            accessLevel={accessLevel}
            onSave={updateStaffQualification.bind(null, staff.id)}
          />
        </Panel>
        <a
          href={teachingCouncilSearchUrl(staff.full_name)}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-3 rounded-2xl border border-charcoal/10 bg-white px-5 py-4 text-sm transition-colors hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
        >
          <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal" />
          <span>
            <span className="font-medium text-lilac-700">Check {firstName}&apos;s Teaching Council registration ↗</span>
            <span className="mt-0.5 block text-charcoal/70">
              Opens the Teaching Council&apos;s own search with this name filled in. Registration status and expiry
              aren&apos;t stored in Earlydesk.
            </span>
          </span>
        </a>
      </div>
      <Panel id="panel-qual-docs" title="Qualification and first aid records" bodyClassName="border-t border-charcoal/10 px-5 py-5">
        <RequiredDocumentsPanel
          slots={qualificationSlots}
          otherDocuments={qualificationOtherDocs}
          onUpload={recordStaffDocumentUpload.bind(null, staff.id)}
          onDelete={deleteStaffDocument.bind(null, staff.id)}
          otherLabel="First aid and other records"
        />
      </Panel>
    </div>
  );

  const documents = (
    <div className="flex flex-col gap-4">
      {accessLevel !== "full" && (
        <p className="rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-sm text-charcoal/80">
          Contracts are restricted to authorised management, so any on file aren&apos;t listed for your account.
        </p>
      )}
      <Panel
        id="panel-documents"
        title="Documents"
        description="Required documents follow this person's employment type and qualification status."
        bodyClassName="border-t border-charcoal/10 px-5 py-5"
      >
        <RequiredDocumentsPanel
          slots={documentsSlots}
          otherDocuments={documentsOtherDocs}
          onUpload={recordStaffDocumentUpload.bind(null, staff.id)}
          onDelete={deleteStaffDocument.bind(null, staff.id)}
        />
      </Panel>
    </div>
  );

  const notes = (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Panel
        id="panel-general-notes"
        title="General notes"
        description="Visible to anyone with access"
        headerAction={<RecordEditButton variant="link">Edit</RecordEditButton>}
        bodyClassName="border-t border-charcoal/10 px-5 py-4"
      >
        {staff.notes ? (
          <p className="whitespace-pre-line break-words text-sm text-charcoal">{staff.notes}</p>
        ) : (
          <p className="text-sm text-charcoal/70">No general notes recorded.</p>
        )}
      </Panel>
      <section aria-labelledby="confidential-notes-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="confidential-notes-heading" className="text-base font-semibold text-charcoal">
            Confidential notes
          </h2>
          <p className="text-sm text-charcoal/70">Restricted to authorised management.</p>
        </div>
        <StaffNotesPanel staffId={staff.id} notes={staff.notes_log} accessLevel={accessLevel} />
      </section>
    </div>
  );

  const tabs = [
    { key: "overview", label: "Overview", content: overview },
    { key: "employment", label: "Employment", content: employment },
    { key: "qualifications", label: "Qualifications", content: qualifications },
    { key: "documents", label: "Documents", count: staff.documents.length || undefined, content: documents },
    { key: "growth", label: "Professional growth", count: staff.growthCycles.length || undefined, content: <StaffGrowthPanel staffId={staff.id} cycles={staff.growthCycles} /> },
    { key: "notes", label: "Notes", count: accessLevel === "full" ? staff.notes_log.length || undefined : undefined, content: notes },
  ];

  return (
    <RecordShell initialTab={searchParams.tab ?? "overview"} tabKeys={TAB_KEYS}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/70">
          <Link href="/staff" className="rounded hover:text-charcoal hover:underline">
            Staff
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span aria-current="page" className="font-medium text-charcoal">
            {staff.full_name}
          </span>
        </nav>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <StaffAvatar fullName={staff.full_name} photoUrl={staff.photo_url} size="xl" decorative />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-charcoal md:text-[1.75rem]">{staff.full_name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-charcoal/70">
                <span>{staff.role ?? "Role not recorded"}</span>
                <span aria-hidden="true">·</span>
                <span>{staff.room_name ?? (staff.is_relief ? "Relief" : "No room")}</span>
                {staff.contract_type && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{STAFF_CONTRACT_TYPE_LABEL[staff.contract_type]}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <StatusPill tone={staff.status === "active" ? "ready" : "neutral"}>
                  {staff.status === "active" ? "Active" : "Former staff"}
                </StatusPill>
              </p>
              {staff.start_date && <p className="mt-1 text-xs text-charcoal/70">Started {formatDate(staff.start_date)}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <RecordEditButton>
              <EditIcon className="h-4 w-4" />
              Edit profile
            </RecordEditButton>
            <Link href={`/email/compose?staffId=${staff.id}`} className="btn-secondary">
              <MailIcon className="h-4 w-4" />
              Email staff
            </Link>
            <StaffActionsMenu staffId={staff.id} fullName={staff.full_name} status={staff.status} />
          </div>
        </header>

        <RecordTabs tabs={tabs} label="Staff profile sections" />

        <p className="pb-2 text-center text-xs text-charcoal/70">
          Pay, contracts and confidential notes are only shown to authorised management.
        </p>
      </div>

      <StaffEditDrawer
        staffId={staff.id}
        staffName={staff.full_name}
        photoUrl={staff.photo_url}
        rooms={rooms}
        accessLevel={accessLevel}
        onSave={updateStaffDetails.bind(null, staff.id)}
        values={{
          fullName: staff.full_name,
          role: staff.role,
          roomId: staff.room_id,
          isRelief: staff.is_relief,
          contractType: staff.contract_type,
          startDate: staff.start_date,
          endDate: staff.end_date,
          minHours: staff.min_hours,
          payRate: staff.pay_rate,
          taxCode: staff.tax_code,
          email: staff.email,
          mobilePhone: staff.mobile_phone,
          dateOfBirth: staff.date_of_birth,
          emergencyName: staff.emergency_contact_name,
          emergencyPhone: staff.emergency_contact_phone,
          emergencyRelationship: staff.emergency_contact_relationship,
          notes: staff.notes,
        }}
      />
    </RecordShell>
  );
}
