"use client";

import { useState, useTransition } from "react";
import { UploadChecklistEvidenceModal } from "./upload-checklist-evidence-modal";
import { StatusBadge } from "@/components/status-badge";
import { EyeIcon, DownloadIcon, UploadIcon } from "@/components/icons";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { getSignedUrlForStaffDocument } from "@/lib/actions/staff";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import type { UploadChecklistEvidenceResult } from "@/lib/actions/staff";
import type { StaffChecklistItem } from "@/lib/types";

export function StaffChecklistItemRow({
  item,
  onChange,
  onUploadEvidence,
}: {
  item: StaffChecklistItem;
  onChange: (fields: { is_checked?: boolean; notes?: string | null }) => Promise<void>;
  onUploadEvidence: (formData: FormData) => Promise<UploadChecklistEvidenceResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(item.is_checked);
  const [showNotes, setShowNotes] = useState(Boolean(item.notes));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);

  const alert = item.supports_expiry && item.document ? getDeadlineAlert(null, item.document.expiry_date) : null;

  function toggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      await onChange({ is_checked: next });
    });
  }

  function saveNotes() {
    startTransition(async () => {
      await onChange({ notes: notes || null });
    });
  }

  async function openFile(download: boolean) {
    if (!item.document) return;
    const url = await getSignedUrlForStaffDocument(item.document.storage_path, download);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-2 px-5 py-3.5">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={toggle}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-charcoal/30 text-burgundy-500 focus:ring-burgundy-400"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={checked ? "text-sm text-charcoal/50 line-through" : "text-sm text-charcoal"}>
              {item.description}
            </p>
            {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}
          </div>
          {checked && item.checked_at && !item.document && (
            <p className="mt-0.5 text-xs text-charcoal/40">
              Checked {formatDateTime(item.checked_at)}
              {item.checked_by_name ? ` by ${item.checked_by_name}` : ""}
            </p>
          )}

          {item.document ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-cream/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-charcoal">{item.document.original_filename}</p>
                <p className="mt-0.5 truncate text-xs text-charcoal/50">
                  {formatFileSize(item.document.file_size_bytes)}
                  {item.document.document_date ? ` · completed ${formatDate(item.document.document_date)}` : ""}
                  {item.document.expiry_date ? ` · next due ${formatDate(item.document.expiry_date)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-charcoal/40 hover:bg-white hover:text-charcoal"
                  title="Preview"
                  onClick={() => openFile(false)}
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-charcoal/40 hover:bg-white hover:text-charcoal"
                  title="Download"
                  onClick={() => openFile(true)}
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
                <button type="button" className="ml-1 text-xs font-medium text-burgundy-500 hover:underline" onClick={() => setUploadOpen(true)}>
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-burgundy-500 hover:underline"
              onClick={() => setUploadOpen(true)}
            >
              <UploadIcon className="h-3.5 w-3.5" />
              Upload evidence
            </button>
          )}

          {!showNotes && (
            <button
              type="button"
              className="mt-1 block text-xs font-medium text-charcoal/40 hover:text-charcoal/60 hover:underline"
              onClick={() => setShowNotes(true)}
            >
              + Add a note
            </button>
          )}
        </div>
      </div>

      {showNotes && (
        <input
          type="text"
          className="input ml-7 text-xs"
          placeholder="Optional note — e.g. where the physical copy is filed"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
        />
      )}

      <UploadChecklistEvidenceModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        itemLabel={item.description}
        supportsExpiry={item.supports_expiry}
        onUpload={onUploadEvidence}
      />
    </div>
  );
}
