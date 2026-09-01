import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmergencyDrillById } from "@/lib/data/emergency-drills";
import { PrintButton } from "@/components/audit-pack/print-button";
import { AttachEvidenceForm } from "@/components/emergency-drills/attach-evidence-form";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import { EMERGENCY_DRILL_TYPE_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-sm text-ocean-900">{value ?? "—"}</p>
    </div>
  );
}

export default async function EmergencyDrillDetailPage({ params }: { params: { id: string } }) {
  const drill = await getEmergencyDrillById(params.id);
  if (!drill) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 print:max-w-none">
      <nav className="flex items-center gap-1.5 text-sm text-ocean-500 print:hidden">
        <Link href="/emergency-drills" className="hover:text-ocean-700">
          Emergency Drill Register
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-ocean-800">
          {EMERGENCY_DRILL_TYPE_LABEL[drill.drill_type]} — {formatDate(drill.drill_date)}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">
            Emergency Drill Record
          </h1>
          <p className="mt-1 text-sm text-ocean-500">
            Beach Kids · {EMERGENCY_DRILL_TYPE_LABEL[drill.drill_type]} · {formatDate(drill.drill_date)}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {drill.evidence_id && <StatusBadge tone="ready">Filed as evidence</StatusBadge>}
          <PrintButton />
        </div>
      </div>

      <section className="card grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 print:border print:shadow-none">
        <Field label="Drill type" value={EMERGENCY_DRILL_TYPE_LABEL[drill.drill_type]} />
        <Field label="Date carried out" value={formatDate(drill.drill_date)} />
        <Field label="Duration" value={drill.duration_minutes !== null ? `${drill.duration_minutes} minutes` : null} />
        <Field label="Children took part" value={drill.children_involved ? "Yes" : "No"} />
        <Field label="Children present" value={drill.children_present} />
        <Field label="Staff present" value={drill.staff_present} />
        <Field label="Assembly point" value={drill.assembly_point} />
        <Field label="Conducted by" value={drill.conducted_by} />
      </section>

      <section className="card flex flex-col gap-5 p-6 print:border print:shadow-none">
        <Field label="What happened" value={drill.what_happened} />
        <Field label="What went well" value={drill.what_went_well} />
        <Field label="Issues encountered / improvements needed" value={drill.improvements_needed} />
        <Field
          label="Evaluation — how this informs the emergency plan"
          value={drill.evaluation_notes}
        />
      </section>

      <section className="card p-6 text-xs text-ocean-500 print:border print:shadow-none">
        <p>
          Recorded by {drill.recorded_by_name ?? "—"} on {formatDateTime(drill.created_at)}. Next drill due{" "}
          {formatDate(drill.next_due_date)}.
        </p>
      </section>

      <section className="card p-5 print:hidden">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ocean-500">File as evidence</h2>
        {drill.evidence_id ? (
          <p className="text-sm text-ocean-700">
            This drill has been filed as evidence for HS8. You can find it in the{" "}
            <Link href="/evidence" className="font-medium text-ocean-800 underline">
              Evidence Library
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ocean-500">
              Browsers can&apos;t hand a page the PDF it just saved, so there&apos;s one small manual step: click{" "}
              <strong>Print / Save as PDF</strong> above, save it anywhere on your computer, then choose that same
              file below. It&apos;ll be filed as evidence and linked to HS8 automatically — the compliance
              status for HS8 is left for you to set yourself.
            </p>
            <AttachEvidenceForm drillId={drill.id} />
          </>
        )}
      </section>
    </div>
  );
}
