"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { STAFF_DOCUMENT_CATEGORIES, STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import type { UploadStaffDocumentResult } from "@/lib/actions/staff";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

export function AddStaffDocumentModal({
  open,
  onClose,
  onUpload,
  fixedCategory,
  categories = STAFF_DOCUMENT_CATEGORIES,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<UploadStaffDocumentResult>;
  /** When set, the category is fixed (used for uploading/replacing one of
   * the required-document slots) and no dropdown is shown. */
  fixedCategory?: StaffDocumentCategory;
  /** Categories offered in the dropdown when fixedCategory isn't set.
   * Defaults to the general "other documents" list. */
  categories?: StaffDocumentCategory[];
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

  const title = fixedCategory
    ? `Upload: ${STAFF_DOCUMENT_CATEGORY_LABEL[fixedCategory]}`
    : "Upload a document";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fixedCategory ? (
          <input type="hidden" name="category" value={fixedCategory} />
        ) : (
          <div>
            <label className="label" htmlFor="category">
              Document type
            </label>
            <select id="category" name="category" className="input" defaultValue={categories[0] ?? "other"}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {STAFF_DOCUMENT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <div>
            <label className="label" htmlFor="expiry_date">
              Next due / expiry (optional)
            </label>
            <input id="expiry_date" name="expiry_date" type="date" className="input" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-charcoal/40">
          Set a next due date for anything that needs renewing (police vet, first aid, visa, professional growth
          cycle) to get an alert as it approaches.
        </p>

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
            {pending ? "Uploading…" : "Upload document"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
