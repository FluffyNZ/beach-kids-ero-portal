import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordTabLink } from "@/components/ui/record-shell";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { documentStatus } from "@/lib/staff-format";
import { formatDate } from "@/lib/utils";
import type { StaffDocument } from "@/lib/types";

const RECENT_COUNT = 4;

/** Overview's "Recent documents": the latest uploads across every
 * category, newest first, with Preview and Download. Upload and remove
 * stay on the Documents and Qualifications tabs. */
export function StaffDocumentsSummary({ documents, missingRequired = 0 }: { documents: StaffDocument[]; missingRequired?: number }) {
  const recent = documents.slice(0, RECENT_COUNT);
  return (
    <Panel id="panel-recent-docs" title="Recent documents" count={documents.length} headerAction={<RecordTabLink tab="documents">View all</RecordTabLink>}>
      {missingRequired > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 bg-status-attentionBg/60 px-5 py-2.5 text-sm">
          <span className="text-charcoal">
            {missingRequired} required {missingRequired === 1 ? "document is" : "documents are"} missing
          </span>
          <RecordTabLink tab="documents">See which</RecordTabLink>
        </div>
      )}
      {recent.length === 0 ? (
        <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {recent.map((doc) => {
            const status = documentStatus(doc.expiry_date);
            return (
              <li key={doc.id} className="flex flex-col gap-1.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[doc.category]}</p>
                  <p className="break-all text-xs text-charcoal/80">{doc.original_filename}</p>
                  <p className="text-xs text-charcoal/70">Uploaded {formatDate(doc.uploaded_at)}</p>
                  {status.kind !== "on_file" && (
                    <StatusPill tone={status.tone} className="mt-1">
                      {status.label}
                    </StatusPill>
                  )}
                </div>
                <StaffDocumentRowActions storagePath={doc.storage_path} filename={doc.original_filename} />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
