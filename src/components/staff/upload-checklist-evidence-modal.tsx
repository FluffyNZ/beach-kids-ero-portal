"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import type { UploadChecklistEvidenceResult } from "@/lib/actions/staff";

export function UploadChecklistEvidenceModal({
  open,
  onClose,
  itemLabel,
  supportsExpiry,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  itemLabel: string;
  supportsExpiry: boolean;
  onUpload: (formData: FormData) => Promise<UploadChecklistEvidenceResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await onUpload(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Upload evidence — ${itemLabel}`}>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="file">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-burgundy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-burgundy-600"
          />
          <p className="mt-1 text-xs text-charcoal/40">PDF, Word or image. Up to 50MB.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="document_date">
              Date completed (optional)
            </label>
            <input id="document_date" name="document_date" type="date" className="input" />
          </div>
          {supportsExpiry && (
            <div>
              <label className="label" htmlFor="expiry_date">
                Next due / expiry
              </label>
              <input id="expiry_date" name="expiry_date" type="date" className="input" />
            </div>
          )}
        </div>
        {supportsExpiry && (
          <p className="-mt-2 text-xs text-charcoal/40">
            Set a next due date so this gets a renewal alert as it approaches.
          </p>
        )}

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" className="input min-h-[60px]" placeholder="Optional" />
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Uploading…" : "Upload & mark complete"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
