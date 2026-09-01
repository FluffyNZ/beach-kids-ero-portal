import { getEvidenceList } from "@/lib/data/evidence";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { EvidenceSearchBar } from "@/components/evidence/search-bar";
import { EvidenceTable } from "@/components/evidence/evidence-table";
import { UploadEvidenceButton } from "@/components/evidence/upload-button";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function EvidenceLibraryPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const evidence = await getEvidenceList({ search: searchParams.q, category: searchParams.category });

  const expired = evidence.filter((e) => (getDeadlineAlert(e.review_date, e.expiry_date)?.days ?? 1) < 0).length;
  const due30 = evidence.filter((e) => {
    const d = getDeadlineAlert(e.review_date, e.expiry_date)?.days;
    return d !== undefined && d >= 0 && d <= 30;
  }).length;
  const due60 = evidence.filter((e) => {
    const d = getDeadlineAlert(e.review_date, e.expiry_date)?.days;
    return d !== undefined && d > 30 && d <= 60;
  }).length;
  const due90 = evidence.filter((e) => {
    const d = getDeadlineAlert(e.review_date, e.expiry_date)?.days;
    return d !== undefined && d > 60 && d <= 90;
  }).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">Evidence Library</h1>
          <p className="mt-1 text-sm text-ocean-500">
            Uploaded once, linked to as many ERO criteria as needed.
          </p>
        </div>
        <UploadEvidenceButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Expired" value={expired} tone="action" />
        <StatTile label="Due within 30 days" value={due30} tone="action" />
        <StatTile label="Due within 60 days" value={due60} tone="attention" />
        <StatTile label="Due within 90 days" value={due90} tone="attention" />
      </div>

      <EvidenceSearchBar />

      <EvidenceTable evidence={evidence} />
    </div>
  );
}
