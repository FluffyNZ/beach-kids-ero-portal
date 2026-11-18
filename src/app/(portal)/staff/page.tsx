import { getStaffList } from "@/lib/data/staff";
import { getRosterRooms } from "@/lib/data/roster";
import { getStaffDirectoryExtras } from "@/lib/data/staff-directory";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { PageHeader } from "@/components/ui/page-header";
import { NewStaffButton } from "@/components/staff/new-staff-button";
import { StaffDirectory, type DirectoryStaff } from "@/components/staff/staff-directory";
import { STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import { alertWords, documentStatus, missingRequiredDocuments, qualificationLabel } from "@/lib/staff-format";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; room?: string; contractType?: string; show?: string };
}) {
  // Everyone (active and former) is loaded once and filtered in the
  // browser, so the filters and summary counts always agree. Filters are
  // mirrored into the URL so a filtered view can be bookmarked.
  const [staff, rooms] = await Promise.all([getStaffList(), getRosterRooms()]);
  const extras = await getStaffDirectoryExtras(staff.map((s) => s.id));

  const directory: DirectoryStaff[] = staff.map((s) => {
    const present = extras.categories.get(s.id) ?? new Set<string>();
    const expiries = extras.expiries.get(s.id) ?? [];
    const renewals = expiries.filter((e) => getDeadlineAlert(null, e) !== null);
    const nearest = s.nearest_document_expiry ? documentStatus(s.nearest_document_expiry) : null;
    const review = getDeadlineAlert(s.qualification.next_review_date, null);
    const optionalMissing = [
      !s.email ? "Email" : null,
      !s.mobile_phone ? "Mobile number" : null,
      !s.emergency_contact_name && !s.emergency_contact_phone ? "Emergency contact" : null,
      !s.date_of_birth ? "Date of birth" : null,
      !extras.hasAvailability.has(s.id) ? "Weekly availability" : null,
      (s.contract_type === "permanent" || s.contract_type === "fixed_term") && s.min_hours === null ? "Contracted hours" : null,
    ].filter((x): x is string => Boolean(x));

    return {
      id: s.id,
      fullName: s.full_name,
      role: s.role,
      photoUrl: s.photo_url,
      roomId: s.room_id,
      roomName: s.room_name,
      roomColor: s.room_color,
      contractType: s.contract_type,
      contractLabel: s.contract_type ? STAFF_CONTRACT_TYPE_LABEL[s.contract_type] : null,
      isRelief: s.is_relief,
      status: s.status,
      documentAlert: nearest && nearest.kind !== "on_file" ? { label: nearest.label, tone: nearest.tone } : null,
      documentsToRenew: renewals.length,
      reviewAlert: review ? { label: alertWords(review), tone: review.tone } : null,
      qualification: qualificationLabel(s.role, s.qualification.qualification_status),
      missingRequired: missingRequiredDocuments(s.qualification.qualification_status, s.contract_type, present).map((m) => m.label),
      optionalMissing,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Staff"
        description="The team's profiles, documents, qualifications and availability."
        actions={<NewStaffButton />}
      />
      <StaffDirectory
        staffList={directory}
        rooms={rooms.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
        initial={{
          q: searchParams.q ?? "",
          room: searchParams.room ?? "",
          contractType: searchParams.contractType ?? "",
          status: searchParams.status === "former" ? "former" : "active",
          show: (["documents", "reviews", "missing"] as const).find((v) => v === searchParams.show) ?? "",
        }}
      />
    </div>
  );
}
