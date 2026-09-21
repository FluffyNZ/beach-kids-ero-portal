import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccidentIllnessRecordById } from "@/lib/data/accident-illness";
import { getChildrenList } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getStaffList } from "@/lib/data/staff";
import { RecordForm } from "@/components/accident-illness/record-form";
import { EvidencePhoto } from "@/components/accident-illness/evidence-photo";
import { ChevronRightIcon } from "@/components/icons";
import { formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccidentIllnessRecordPage({ params }: { params: { id: string } }) {
  const [record, allChildren, rooms, staff] = await Promise.all([
    getAccidentIllnessRecordById(params.id),
    getChildrenList(),
    getRosterRooms(),
    getStaffList(),
  ]);

  if (!record) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records/accidents-illness" className="hover:text-charcoal">
          Accident &amp; Illness Records
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{record.child_name}</span>
      </nav>

      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">{record.child_name}</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          {formatShortDate(record.incident_date)} ·{" "}
          <Link href={`/children/${record.child_id}`} className="text-burgundy-600 hover:underline">
            View child profile
          </Link>
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Signed paper form
        </h2>
        <EvidencePhoto recordId={record.id} photoUrl={record.evidencePhotoUrl} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Record details</h2>
        <RecordForm record={record} allChildren={allChildren} rooms={rooms} staff={staff} />
      </section>
    </div>
  );
}
