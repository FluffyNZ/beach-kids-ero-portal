"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import type { AddVersionResult } from "@/lib/actions/policies";

export function AddVersionModal({
  open,
  onClose,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<AddVersionResult>;
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
    <Modal open={open} onClose={onClose} title="Add a new version">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="file">
            Document
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-burgundy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-burgundy-600"
          />
          <p className="mt-1 text-xs text-charcoal/40">
            PDF, Word or image. Up to 50MB. Uploaded as a draft — approve it once ready to make it current.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="change_summary">
            What changed
          </label>
          <textarea id="change_summary" name="change_summary" className="input min-h-[60px]" placeholder="e.g. Updated evacuation procedure, added new sign-in step" />
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Uploading…" : "Upload version"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
