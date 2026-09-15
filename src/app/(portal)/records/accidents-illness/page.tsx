import Link from "next/link";
import { getAccidentIllnessRecords } from "@/lib/data/accident-illness";
import { getChildrenList } from "@/lib/data/children";
import { monthLabel } from "@/lib/data/learning-stories";
import { RecordCard } from "@/components/accident-illness/record-card";
import { RecordFiltersBar } from "@/components/accident-illness/record-filters-bar";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AccidentIllnessListPage({
  searchParams,
}: {
  searchParams: { child?: string; month?: string };
}) {
  const [records, allChildren] = await Promise.all([
    getAccidentIllnessRecords({ childId: searchParams.child, monthKey: searchParams.month }),
    // Both active and left children — an old record might well be for a
    // child who's since moved on, and it still needs to be filterable.
    getChildrenList(),
  ]);

  const childById = new Map(allChildren.map((c) => [c.id, c]));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records" className="hover:text-charcoal">
          Records &amp; Compliance
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Accidents / Incidents &amp; Illness</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Accident &amp; Illness Records</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            One record per completed Accident &amp; Illness Form — for moderate to serious injuries where a parent
            was contacted.
          </p>
        </div>
        <Link href="/records/accidents-illness/new" className="btn-primary">
          New record
        </Link>
      </div>

      <RecordFiltersBar allChildren={allChildren} />

      <div className="flex flex-col gap-3">
        {records.length === 0 && (
          <p className="card p-6 text-center text-sm text-charcoal/50">
            No accident or illness records found
            {searchParams.month ? ` for ${monthLabel(searchParams.month)}` : ""}
            {searchParams.child ? " for this child" : ""}.
          </p>
        )}
        {records.map((r) => (
          <RecordCard key={r.id} record={r} child={childById.get(r.child_id)} />
        ))}
      </div>
    </div>
  );
}
