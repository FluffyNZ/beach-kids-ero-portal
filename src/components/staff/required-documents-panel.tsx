"use client";

import { useState } from "react";
import { DocumentRing } from "./document-ring";
import { AddStaffDocumentModal } from "./add-staff-document-modal";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { StatusBadge } from "@/components/status-badge";
import { UploadIcon, TrashIcon } from "@/components/icons";
import { STAFF_DOCUMENT_CATEGORY_LABEL, STAFF_DOCUMENT_CATEGORIES } from "@/lib/constants";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { formatDate, formatFileSize, percentage } from "@/lib/utils";
import type { RequiredDocumentSlot } from "@/lib/staff-required-documents";
import type { StaffDocument } from "@/lib/types";
import type { RecordStaffDocumentFields, RecordStaffDocumentResult, DeleteStaffDocumentResult } from "@/lib/actions/staff";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

/** One uploaded file, wherever it's listed — a required slot (which can now
 * hold more than one) or the general "Other documents" list. Removing one
 * only ever takes that single file, never the rest of the category. */
function DocumentRow({
  document,
  onDelete,
  categoryLabel,
}: {
  document: StaffDocument;
  onDelete: (documentId: string) => Promise<DeleteStaffDocumentResult>;
  /** Shown above the filename — used in the "Other documents" list, where
   * (unlike a required slot) the category isn't already given by a shared
   * heading above the row. */
  categoryLabel?: string;
}) {
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const alert = getDeadlineAlert(null, document.expiry_date);

  async function handleRemove() {
    if (removing) return;
    if (!window.confirm(`Remove "${document.original_filename}"? This can't be undone.`)) return;
    setRemoving(true);
    setRemoveError(null);
    const result = await onDelete(document.id);
    if (!result.success) {
      // On success the row disappears once the page re-renders with fresh
      // data — only a failure needs to reset back to a retryable state.
      setRemoving(false);
      setRemoveError(result.error);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        {categoryLabel && <p className="text-xs font-medium text-charcoal/60">{categoryLabel}</p>}
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-charcoal">{document.original_filename}</p>
          {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}
        </div>
        <p className="mt-0.5 truncate text-xs text-charcoal/50">
          {formatFileSize(document.file_size_bytes)} · uploaded {formatDate(document.uploaded_at)}
          {document.document_date ? ` · completed ${formatDate(document.document_date)}` : ""}
        </p>
        {removeError && <p className="mt-0.5 text-xs text-status-action">{removeError}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StaffDocumentRowActions storagePath={document.storage_path} />
        <button
          type="button"
          disabled={removing}
          className="rounded-lg p-2 text-charcoal/40 hover:bg-status-actionBg hover:text-status-action disabled:opacity-50"
          title="Remove"
          onClick={handleRemove}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export function RequiredDocumentsPanel({
  slots,
  otherDocuments,
  onUpload,
  onDelete,
}: {
  slots: RequiredDocumentSlot[];
  otherDocuments: StaffDocument[];
  onUpload: (fields: RecordStaffDocumentFields) => Promise<RecordStaffDocumentResult>;
  onDelete: (documentId: string) => Promise<DeleteStaffDocumentResult>;
}) {
  const [uploadCategory, setUploadCategory] = useState<StaffDocumentCategory | null>(null);
  const [addOtherOpen, setAddOtherOpen] = useState(false);

  const completed = slots.filter((s) => s.documents.length > 0).length;
  const percent = percentage(completed, slots.length);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <DocumentRing percent={percent} completed={completed} total={slots.length} />
        <p className="text-sm text-charcoal/60">
          The {slots.length} documents ERO expects on file for this person. Missing ones are marked below — click
          Upload to add one. Some requirements (like Qualification &amp; Teacher Registration) need more than one
          file — use &quot;Add another&quot; to keep adding to the same one.
        </p>
      </div>

      <ul className="divide-y divide-charcoal/5 rounded-xl border border-charcoal/10">
        {slots.map(({ category, documents }) => (
          <li key={category} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[category]}</p>
                {documents.length === 0 ? (
                  <StatusBadge tone="action">Missing</StatusBadge>
                ) : (
                  <span className="text-xs text-charcoal/40">
                    {documents.length} file{documents.length > 1 ? "s" : ""} on file
                  </span>
                )}
              </div>
              <button type="button" className="btn-secondary" onClick={() => setUploadCategory(category)}>
                <UploadIcon className="h-4 w-4" />
                {documents.length > 0 ? "Add another" : "Upload"}
              </button>
            </div>
            {documents.length > 0 && (
              <ul className="flex flex-col divide-y divide-charcoal/5 rounded-lg border border-charcoal/10 bg-cream/30">
                {documents.map((d) => (
                  <DocumentRow key={d.id} document={d} onDelete={onDelete} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Other documents</h3>
          <button type="button" className="btn-ghost" onClick={() => setAddOtherOpen(true)}>
            <UploadIcon className="h-4 w-4" />
            Add other document
          </button>
        </div>
        {otherDocuments.length === 0 ? (
          <p className="text-sm text-charcoal/50">
            Anything else on file for this person — first aid certificate, visa/work entitlement, etc. — will show
            up here. These aren&apos;t counted in the required-documents percentage above.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/5 rounded-xl border border-charcoal/10">
            {otherDocuments.map((d) => (
              <DocumentRow
                key={d.id}
                document={d}
                onDelete={onDelete}
                categoryLabel={STAFF_DOCUMENT_CATEGORY_LABEL[d.category]}
              />
            ))}
          </ul>
        )}
      </div>

      <AddStaffDocumentModal
        open={uploadCategory !== null}
        onClose={() => setUploadCategory(null)}
        onUpload={onUpload}
        fixedCategory={uploadCategory ?? undefined}
      />
      <AddStaffDocumentModal
        open={addOtherOpen}
        onClose={() => setAddOtherOpen(false)}
        onUpload={onUpload}
        categories={STAFF_DOCUMENT_CATEGORIES}
      />
    </div>
  );
}
