"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EVIDENCE_CATEGORIES } from "@/lib/constants";
import { uploadEvidence } from "@/lib/actions/evidence";

export function UploadEvidenceModal({
  open,
  onClose,
  criterionId,
  criterionCode,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  criterionId?: string;
  criterionCode?: string;
  onUploaded?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadEvidence(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      onUploaded?.();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload evidence">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {criterionId && <input type="hidden" name="criterion_id" value={criterionId} />}
        {criterionCode && <input type="hidden" name="criterion_code" value={criterionCode} />}

        <div>
          <label className="label" htmlFor="file">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.heic"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ocean-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ocean-700"
          />
          <p className="mt-1 text-xs text-ocean-400">PDF, Word, Excel or image. Up to 50MB.</p>
        </div>

        <div>
          <label className="label" htmlFor="title">
            Document title
          </label>
          <input id="title" name="title" type="text" required className="input" placeholder="e.g. First Aid Certificate — J. Smith" />
        </div>

        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" className="input">
            <option value="">Select a category…</option>
            {EVIDENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" className="input min-h-[70px]" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="document_date">
              Document date
            </label>
            <input id="document_date" name="document_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="review_date">
              Review date
            </label>
            <input id="review_date" name="review_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="expiry_date">
              Expiry date
            </label>
            <input id="expiry_date" name="expiry_date" type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" className="input min-h-[60px]" />
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
