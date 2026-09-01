"use client";

import { useState } from "react";
import { DocumentRing } from "./document-ring";
import { AddStaffDocumentModal } from "./add-staff-document-modal";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { StatusBadge } from "@/components/status-badge";
import { UploadIcon } from "@/components/icons";
import { STAFF_DOCUMENT_CATEGORY_LABEL, STAFF_DOCUMENT_CATEGORIES } from "@/lib/constants";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { formatDate, formatFileSize, percentage } from "@/lib/utils";
import type { RequiredDocumentSlot } from "@/lib/staff-required-documents";
import type { StaffDocument } from "@/lib/types";
import type { UploadStaffDocumentResult } from "@/lib/actions/staff";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

export function RequiredDocumentsPanel({
  slots,
  otherDocuments,
  onUpload,
}: {
  slots: RequiredDocumentSlot[];
  otherDocuments: StaffDocument[];
  onUpload: (formData: FormData) => Promise<UploadStaffDocumentResult>;
}) {
  const [uploadCategory, setUploadCategory] = useState<StaffDocumentCategory | null>(null);
  const [addOtherOpen, setAddOtherOpen] = useState(false);

  const completed = slots.filter((s) => s.document !== null).length;
  const percent = percentage(completed, slots.length);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <DocumentRing percent={percent} completed={completed} total={slots.length} />
        <p className="text-sm text-charcoal/60">
          The {slots.length} documents ERO expects on file for this person. Missing ones are marked below — click
          Upload to add one.
        </p>
      </div>

      <ul className="divide-y divide-charcoal/5 rounded-xl border border-charcoal/10">
        {slots.map(({ category, document }) => {
          const alert = document ? getDeadlineAlert(null, document.expiry_date) : null;
          return (
            <li key={category} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[category]}</p>
                  {document ? (
                    alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>
                  ) : (
                    <StatusBadge tone="action">Missing</StatusBadge>
                  )}
                </div>
                {document ? (
                  <p className="mt-0.5 truncate text-xs text-charcoal/50">
                    {document.original_filename} · {formatFileSize(document.file_size_bytes)} · uploaded{" "}
                    {formatDate(document.uploaded_at)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-charcoal/40">Not uploaded yet</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {document && <StaffDocumentRowActions storagePath={document.storage_path} />}
                <button type="button" className="btn-secondary" onClick={() => setUploadCategory(category)}>
                  <UploadIcon className="h-4 w-4" />
                  {document ? "Replace" : "Upload"}
                </button>
              </div>
            </li>
          );
        })}
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
            {otherDocuments.map((d) => {
              const alert = getDeadlineAlert(null, d.expiry_date);
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-charcoal">{STAFF_DOCUMENT_CATEGORY_LABEL[d.category]}</p>
                      {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-charcoal/50">
                      {d.original_filename} · {formatFileSize(d.file_size_bytes)} · uploaded {formatDate(d.uploaded_at)}
                    </p>
                  </div>
                  <StaffDocumentRowActions storagePath={d.storage_path} />
                </li>
              );
            })}
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
