import { getStaffList } from "@/lib/data/staff";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { StaffSearchBar } from "@/components/staff/staff-search-bar";
import { StaffTable } from "@/components/staff/staff-table";
import { NewStaffButton } from "@/components/staff/new-staff-button";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const staff = await getStaffList({ search: searchParams.q, status: searchParams.status });

  const activeCount = staff.filter((s) => s.status === "active").length;
  const documentsDue = staff.filter((s) => {
    const alert = getDeadlineAlert(null, s.nearest_document_expiry);
    return alert !== null;
  }).length;
  const reviewsDue = staff.filter((s) => {
    const alert = getDeadlineAlert(s.qualification.next_review_date, null);
    return alert !== null;
  }).length;
  const incompleteProfiles = staff.filter(
    (s) => s.required_docs_total > 0 && s.required_docs_completed < s.required_docs_total
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Staff directory, their files, and the qualifications &amp; pay parity tracker.
          </p>
        </div>
        <NewStaffButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active staff" value={activeCount} tone="neutral" />
        <StatTile label="Documents expiring / overdue" value={documentsDue} tone="attention" />
        <StatTile label="Qualification reviews due" value={reviewsDue} tone="attention" />
        <StatTile label="Incomplete profiles" value={incompleteProfiles} tone="attention" />
      </div>

      <StaffSearchBar />

      <StaffTable staff={staff} />
    </div>
  );
}
