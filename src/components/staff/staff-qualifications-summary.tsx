import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { STAFF_QUALIFICATION_TAB_DOCUMENT_CATEGORIES, STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import type { RequiredDocumentSlot } from "@/lib/staff-required-documents";

/** Overview's read-only "Qualifications & checks" card — one row per
 * qualification-tab document category (teaching qualification/registration,
 * police verification, safety checking, first aid), using the real category
 * labels already used on the Qualifications tab rather than inventing new
 * ones. Status is "Not recorded" when nothing is on file, the same renewal
 * alert as the Qualifications tab when the newest file on file has an
 * expiry date approaching, or a plain "On file" otherwise. */
export function StaffQualificationsSummary({ staffId, slots }: { staffId: string; slots: RequiredDocumentSlot[] }) {
  const byCategory = new Map(slots.map((s) => [s.category, s] as const));

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Qualifications &amp; checks</h2>
        <Link href={`/staff/${staffId}?tab=qualifications`} className="text-xs font-medium text-burgundy-600 hover:underline">
          View qualifications &rarr;
        </Link>
      </div>

      <ul className="flex flex-col divide-y divide-charcoal/5">
        {STAFF_QUALIFICATION_TAB_DOCUMENT_CATEGORIES.map((category) => {
          const slot = byCategory.get(category);
          const newest = slot?.documents[0] ?? null;
          const alert = newest ? getDeadlineAlert(null, newest.expiry_date) : null;

          return (
            <li key={category} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[category]}</span>
              {!newest ? (
                <StatusBadge tone="action">Not recorded</StatusBadge>
              ) : alert ? (
                <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>
              ) : (
                <StatusBadge tone="ready">On file</StatusBadge>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
