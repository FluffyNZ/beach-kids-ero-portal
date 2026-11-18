"use client";

import { useState } from "react";
import { AddStaffDocumentModal } from "./add-staff-document-modal";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { StatusPill } from "@/components/ui/status-pill";
import { UploadIcon, TrashIcon, DocumentIcon } from "@/components/icons";
import { STAFF_DOCUMENT_CATEGORY_LABEL, STAFF_DOCUMENT_CATEGORIES } from "@/lib/constants";
import { documentStatus } from "@/lib/staff-format";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { RequiredDocumentSlot } from "@/lib/staff-required-documents";
import type { StaffDocument } from "@/lib/types";
import type { RecordStaffDocumentFields, RecordStaffDocumentResult, DeleteStaffDocumentResult } from "@/lib/actions/staff";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

/** One stored file: type (when not given by a heading above), filename,
 * dates, status, and Preview / Download / Remove. Removing asks first and
 * only ever takes this one file. */
function DocumentRow({
  document,
  onDelete,
  showType,
}: {
  document: StaffDocument;
  onDelete: (documentId: string) => Promise<DeleteStaffDocumentResult>;
  showType?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const status = documentStatus(document.expiry_date);

  async function handleRemove() {
    setRemoving(true);
    setRemoveError(null);
    const result = await onDelete(document.id);
    if (!result.success) {
      setRemoving(false);
      setRemoveError(result.error);
    }
  }

  const dates = [
    `Uploaded ${formatDate(document.uploaded_at)}`,
    document.document_date ? `Completed ${formatDate(document.document_date)}` : null,
    document.expiry_date ? `Expires ${formatDate(document.expiry_date)}` : "No expiry date",
    document.file_size_bytes ? formatFileSize(document.file_size_bytes) : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 gap-3">
        <DocumentIcon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/60" />
        <div className="min-w-0">
          {showType && <p className="text-sm font-medium text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[document.category]}</p>}
          <p className={`break-all text-sm ${showType ? "text-charcoal/80" : "font-medium text-charcoal"}`}>{document.original_filename}</p>
          <p className="mt-0.5 text-xs text-charcoal/70">{dates.join(" · ")}</p>
          {document.notes && <p className="mt-0.5 text-xs text-charcoal/70">{document.notes}</p>}
          <StatusPill tone={status.tone} className="mt-1.5">
            {status.label}
          </StatusPill>
          {removeError && (
            <p role="alert" className="mt-1 text-xs text-charcoal">
              {removeError}
            </p>
          )}
        </div>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
          <span className="text-charcoal">Remove this file?</span>
          <button type="button" className="btn-danger px-3 py-1.5" disabled={removing} onClick={handleRemove}>
            {removing ? "Removing…" : "Remove"}
          </button>
          <button type="button" className="btn-secondary px-3 py-1.5" disabled={removing} onClick={() => setConfirming(false)}>
            Keep
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 self-start sm:self-center">
          <StaffDocumentRowActions storagePath={document.storage_path} filename={document.original_filename} />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-charcoal transition-colors hover:bg-status-actionBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
            onClick={() => setConfirming(true)}
          >
            <TrashIcon className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Remove</span>
            <span className="sr-only"> {document.original_filename}</span>
          </button>
        </div>
      )}
    </li>
  );
}

/** Required documents (from the existing rules for this person's
 * qualification status and employment type) and any other documents on
 * file. Each required type shows whether it's missing, expired, due for
 * renewal or on file; "Add new version" keeps earlier files alongside. */
export function RequiredDocumentsPanel({
  slots,
  otherDocuments,
  onUpload,
  onDelete,
  otherLabel = "Other documents",
}: {
  slots: RequiredDocumentSlot[];
  otherDocuments: StaffDocument[];
  onUpload: (fields: RecordStaffDocumentFields) => Promise<RecordStaffDocumentResult>;
  onDelete: (documentId: string) => Promise<DeleteStaffDocumentResult>;
  otherLabel?: string;
}) {
  const [uploadCategory, setUploadCategory] = useState<StaffDocumentCategory | null>(null);
  const [addOtherOpen, setAddOtherOpen] = useState(false);

  const completed = slots.filter((s) => s.documents.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      {slots.length > 0 && (
        <section aria-labelledby="required-docs-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 id="required-docs-heading" className="text-base font-semibold text-charcoal">
                Required
              </h3>
              <p className="text-sm text-charcoal/70">
                {completed} of {slots.length} on file
              </p>
            </div>
            <div
              className="h-2 w-40 overflow-hidden rounded-full bg-charcoal/10"
              role="img"
              aria-label={`${completed} of ${slots.length} required documents on file`}
            >
              <div className="h-full rounded-full bg-charcoal" style={{ width: `${slots.length ? (completed / slots.length) * 100 : 0}%` }} />
            </div>
          </div>

          <ul className="divide-y divide-charcoal/10 rounded-xl border border-charcoal/10">
            {slots.map(({ category, documents }) => {
              const newest = documents[0];
              const status = newest ? documentStatus(newest.expiry_date) : null;
              return (
                <li key={category} className="flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/60 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[category]}</p>
                      {!newest ? (
                        <StatusPill tone="action">Missing</StatusPill>
                      ) : status && status.kind !== "on_file" ? (
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      ) : (
                        <StatusPill tone="ready">On file</StatusPill>
                      )}
                      {documents.length > 1 && <span className="text-xs text-charcoal/70">{documents.length} files</span>}
                    </div>
                    <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setUploadCategory(category)}>
                      <UploadIcon className="h-4 w-4" />
                      {documents.length > 0 ? "Add new version" : "Upload"}
                      <span className="sr-only"> — {STAFF_DOCUMENT_CATEGORY_LABEL[category]}</span>
                    </button>
                  </div>
                  {documents.length > 0 && (
                    <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
                      {documents.map((d) => (
                        <DocumentRow key={d.id} document={d} onDelete={onDelete} />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="other-docs-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="other-docs-heading" className="text-base font-semibold text-charcoal">
              {otherLabel}
            </h3>
            <p className="text-sm text-charcoal/70">Optional — not counted towards required documents.</p>
          </div>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setAddOtherOpen(true)}>
            <UploadIcon className="h-4 w-4" />
            Add document
          </button>
        </div>
        {otherDocuments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal/15 px-4 py-3 text-sm text-charcoal/70">None on file.</p>
        ) : (
          <ul className="divide-y divide-charcoal/10 rounded-xl border border-charcoal/10">
            {otherDocuments.map((d) => (
              <DocumentRow key={d.id} document={d} onDelete={onDelete} showType />
            ))}
          </ul>
        )}
      </section>

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
