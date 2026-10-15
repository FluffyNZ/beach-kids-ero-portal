import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import type { RequiredDocumentSlot } from "@/lib/staff-required-documents";
import type { StaffDocument } from "@/lib/types";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

/** Overview's read-only "Qualifications & checks" card.
 *
 * Which categories are actually required already depends on qualification
 * status elsewhere (getRequiredStaffDocumentCategories, used to build
 * `slots`): a qualified staff member doesn't require Police Verification,
 * and an unqualified one doesn't require the teaching
 * qualification/registration. This card must follow that, not show a fixed
 * list of categories regardless of status — otherwise it flags a category
 * as "Not recorded" for someone who was never required to have it, which
 * is a false alarm, not a gap.
 *
 * `slots` (the already status-aware required categories, filtered to the
 * Qualifications tab by the caller) always get a row, "Not recorded" or
 * otherwise, since those genuinely are required for this person right now.
 * `otherDocuments` covers the optional ones on this tab (first aid) — those
 * only get a row when something's actually on file, since an optional
 * document being missing isn't something to flag at all. */
export function StaffQualificationsSummary({
  staffId,
  slots,
  otherDocuments,
}: {
  staffId: string;
  slots: RequiredDocumentSlot[];
  otherDocuments: StaffDocument[];
}) {
  const requiredRows = slots.map((slot) => ({
    category: slot.category,
    newest: slot.documents[0] ?? null,
  }));

  // otherDocuments is already newest-first per category (see
  // staff-required-documents.ts), so the first match per category is the
  // newest one on file.
  const optionalByCategory = new Map<StaffDocumentCategory, StaffDocument>();
  otherDocuments.forEach((d) => {
    if (!optionalByCategory.has(d.category)) optionalByCategory.set(d.category, d);
  });
  const optionalRows = Array.from(optionalByCategory.entries()).map(([category, doc]) => ({
    category,
    newest: doc as StaffDocument | null,
  }));

  const rows = [...requiredRows, ...optionalRows];

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Qualifications &amp; checks</h2>
        <Link href={`/staff/${staffId}?tab=qualifications`} className="text-xs font-medium text-burgundy-600 hover:underline">
          View qualifications &rarr;
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-charcoal/40">Nothing required or on file here yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-charcoal/5">
          {rows.map(({ category, newest }) => {
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
      )}
    </section>
  );
}
