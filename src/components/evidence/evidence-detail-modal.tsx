"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { EyeIcon, DownloadIcon, TrashIcon } from "@/components/icons";
import { updateEvidenceDetails, unlinkEvidenceFromCriterion, getSignedUrlForEvidence } from "@/lib/actions/evidence";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { EVIDENCE_CATEGORIES } from "@/lib/constants";
import { formatDate, formatFileSize } from "@/lib/utils";
import { EvidencePreview } from "./evidence-preview";
import type { EvidenceItem } from "@/lib/types";

export function EvidenceDetailModal({
  evidence,
  open,
  onClose,
}: {
  evidence: EvidenceItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState(evidence?.title ?? "");
  const [category, setCategory] = useState(evidence?.category ?? "");
  const [description, setDescription] = useState(evidence?.description ?? "");
  const [documentDate, setDocumentDate] = useState(evidence?.document_date ?? "");
  const [reviewDate, setReviewDate] = useState(evidence?.review_date ?? "");
  const [expiryDate, setExpiryDate] = useState(evidence?.expiry_date ?? "");
  const [notes, setNotes] = useState(evidence?.notes ?? "");

  // Reset local edit state whenever a different evidence item is opened.
  const [openedId, setOpenedId] = useState(evidence?.id);
  if (evidence && evidence.id !== openedId) {
    setOpenedId(evidence.id);
    setTitle(evidence.title);
    setCategory(evidence.category ?? "");
    setDescription(evidence.description ?? "");
    setDocumentDate(evidence.document_date ?? "");
    setReviewDate(evidence.review_date ?? "");
    setExpiryDate(evidence.expiry_date ?? "");
    setNotes(evidence.notes ?? "");
    setSaved(false);
  }

  if (!evidence) return null;

  const alert = getDeadlineAlert(evidence.review_date, evidence.expiry_date);

  async function openFile(download: boolean) {
    if (!evidence) return;
    const url = await getSignedUrlForEvidence(evidence.storage_path, download);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Modal open={open} onClose={onClose} title="Evidence details" size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-ocean-500">{evidence.original_filename} · {formatFileSize(evidence.file_size_bytes)}</p>
          <div className="flex shrink-0 gap-1">
            <button type="button" className="rounded-lg p-2 text-ocean-500 hover:bg-ocean-50" title="Open in new tab" onClick={() => openFile(false)}>
              <EyeIcon className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-lg p-2 text-ocean-500 hover:bg-ocean-50" title="Download" onClick={() => openFile(true)}>
              <DownloadIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <EvidencePreview
          storagePath={evidence.storage_path}
          mimeType={evidence.mime_type}
          filename={evidence.original_filename}
        />

        {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}

        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} />
        </div>

        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setSaved(false); }}>
            <option value="">Uncategorised</option>
            {EVIDENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[60px]" value={description} onChange={(e) => { setDescription(e.target.value); setSaved(false); }} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Document date</label>
            <input type="date" className="input" value={documentDate} onChange={(e) => { setDocumentDate(e.target.value); setSaved(false); }} />
          </div>
          <div>
            <label className="label">Review date</label>
            <input type="date" className="input" value={reviewDate} onChange={(e) => { setReviewDate(e.target.value); setSaved(false); }} />
          </div>
          <div>
            <label className="label">Expiry date</label>
            <input type="date" className="input" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setSaved(false); }} />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[60px]" value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending}
            className="btn-primary"
            onClick={() =>
              startTransition(async () => {
                await updateEvidenceDetails(evidence.id, {
                  title,
                  category: category || null,
                  description: description || null,
                  document_date: documentDate || null,
                  review_date: reviewDate || null,
                  expiry_date: expiryDate || null,
                  notes: notes || null,
                });
                setSaved(true);
              })
            }
          >
            {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </div>

        <div>
          <h3 className="label mb-2">Linked ERO criteria</h3>
          {evidence.linked_criteria.length === 0 ? (
            <p className="text-sm text-ocean-500">Not linked to any criterion yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {evidence.linked_criteria.map((l) => (
                <li key={l.link_id} className="flex items-center justify-between gap-2 rounded-lg border border-ocean-100 px-3 py-2">
                  <Link href={`/checklist/${l.code}`} className="truncate text-sm text-ocean-800 hover:underline">
                    {l.code} — {l.title}
                  </Link>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-ocean-300 hover:text-status-action"
                    title="Remove link (keeps the original evidence)"
                    onClick={() => startTransition(() => unlinkEvidenceFromCriterion(l.link_id, l.code))}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-ocean-400">
          Uploaded {formatDate(evidence.uploaded_at)}{evidence.uploaded_by_name ? ` by ${evidence.uploaded_by_name}` : ""}
        </p>
      </div>
    </Modal>
  );
}
