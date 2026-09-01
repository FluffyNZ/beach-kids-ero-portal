import { getPolicyList } from "@/lib/data/policies";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { PolicySearchBar } from "@/components/policies/policy-search-bar";
import { PolicyTable } from "@/components/policies/policy-table";
import { NewPolicyButton } from "@/components/policies/new-policy-button";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const policies = await getPolicyList({ search: searchParams.q, category: searchParams.category });

  const overdue = policies.filter((p) => (getDeadlineAlert(p.next_review_date, null)?.days ?? 1) < 0).length;
  const due30 = policies.filter((p) => {
    const d = getDeadlineAlert(p.next_review_date, null)?.days;
    return d !== undefined && d >= 0 && d <= 30;
  }).length;
  const noApprovedVersion = policies.filter((p) => p.current_version === null).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Policies</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Beach Kids&apos; own policies, kept with a full version and approval history.
          </p>
        </div>
        <NewPolicyButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Review overdue" value={overdue} tone="action" />
        <StatTile label="Due within 30 days" value={due30} tone="attention" />
        <StatTile label="No approved version" value={noApprovedVersion} tone="attention" />
      </div>

      <PolicySearchBar />

      <PolicyTable policies={policies} />
    </div>
  );
}
