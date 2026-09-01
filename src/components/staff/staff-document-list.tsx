import { StatusBadge } from "@/components/status-badge";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { StaffDocument } from "@/lib/types";

export function StaffDocumentList({ documents }: { documents: StaffDocument[] }) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">
        No documents uploaded yet — add the contract, ID, police vet, first aid certificate and any other files ERO
        needs for this person.
      </p>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {documents.map((d) => {
        const alert = getDeadlineAlert(null, d.expiry_date);
        return (
          <div key={d.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[d.category]}</p>
                {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal/50">
                {d.original_filename} · {formatFileSize(d.file_size_bytes)} · uploaded {formatDate(d.uploaded_at)}
                {d.uploaded_by_name ? ` by ${d.uploaded_by_name}` : ""}
              </p>
              {(d.document_date || d.expiry_date) && (
                <p className="mt-0.5 text-xs text-charcoal/40">
                  {d.document_date ? `Completed ${formatDate(d.document_date)}` : ""}
                  {d.document_date && d.expiry_date ? " · " : ""}
                  {d.expiry_date ? `Next due ${formatDate(d.expiry_date)}` : ""}
                </p>
              )}
              {d.notes && <p className="mt-1 text-xs text-charcoal/60">{d.notes}</p>}
            </div>

            <StaffDocumentRowActions storagePath={d.storage_path} />
          </div>
        );
      })}
    </div>
  );
}
