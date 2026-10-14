import Link from "next/link";
import type { AccidentIllnessRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/** "Health & permissions" tab content. There's no allergy/medical-condition
 * or consent-form data model anywhere in this app yet (confirmed — nothing
 * in the schema holds that beyond what's below), so this intentionally
 * doesn't invent fields for it. The one real, already-functional source of
 * per-child health data is this child's Accident & Illness record history,
 * which is what's shown here. See the note at the bottom for what's still
 * missing. */
export function ChildHealthPanel({ records }: { records: AccidentIllnessRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Accident &amp; illness history
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-charcoal/50">No accident or illness records logged for this child.</p>
        ) : (
          <div className="flex flex-col divide-y divide-charcoal/5">
            {records.map((r) => (
              <Link
                key={r.id}
                href={`/records/accidents-illness/${r.id}`}
                className="flex flex-wrap items-start justify-between gap-2 py-3 hover:bg-sand-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">{formatDate(r.incident_date)}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-charcoal/60">
                    {r.description || "No description recorded"}
                  </p>
                  <p className="mt-1 text-xs text-charcoal/40">
                    {r.staff_name ? `Attended by ${r.staff_name}` : "No staff member recorded"}
                    {r.parent_signed ? " · Parent signed" : " · Not yet signed by parent"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card border-charcoal/10 bg-sand-50 p-4">
        <p className="text-sm text-charcoal/60">
          This app doesn&apos;t yet have a place to record allergies, medical conditions, medication or consent
          forms for a child — only the accident &amp; illness history above exists today. Let me know if you&apos;d
          like that added as a real feature; nothing here is a placeholder standing in for it.
        </p>
      </div>
    </div>
  );
}
