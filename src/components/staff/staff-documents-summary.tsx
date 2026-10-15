import Link from "next/link";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { DocumentIcon } from "@/components/icons";
import { STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { StaffDocument } from "@/lib/types";

const RECENT_COUNT = 4;

/** Overview's read-only "Recent documents" card — the most recently
 * uploaded files across every category (not just one tab), newest first,
 * since documents is already returned newest-first by getStaffById. Links
 * through to the real Documents tab rather than duplicating its upload/
 * delete controls here. */
export function StaffDocumentsSummary({ staffId, documents }: { staffId: string; documents: StaffDocument[] }) {
  const recent = documents.slice(0, RECENT_COUNT);

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Recent documents</h2>
        <Link href={`/staff/${staffId}?tab=documents`} className="text-xs font-medium text-burgundy-600 hover:underline">
          View all documents &rarr;
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-charcoal/40">Not recorded — no documents uploaded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-charcoal/5">
          {recent.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <DocumentIcon className="h-4 w-4 shrink-0 text-charcoal/30" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[doc.category]}</p>
                  <p className="truncate text-xs text-charcoal/40">
                    {doc.original_filename} &middot; {formatDate(doc.uploaded_at)}
                  </p>
                </div>
              </div>
              <StaffDocumentRowActions storagePath={doc.storage_path} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
