"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { STAFF_DOCUMENT_CATEGORIES, STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { extractStaffDocumentFromPhoto } from "@/lib/actions/staff";
import type { UploadStaffDocumentResult } from "@/lib/actions/staff";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

// Only photo formats the AI reader can look at — matches the server action.
// PDFs and Word docs can still be uploaded as normal, just without auto-fill.
const EXTRACTABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

const LOW_CONFIDENCE_LABELS: Record<string, string> = {
  category_guess: "Document type",
  document_date_guess: "Date completed",
  expiry_date_guess: "Next due / expiry",
};

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

  // Category and the two dates are controlled so a photo read can pre-fill
  // them, while staying exactly as editable as if typed in by hand.
  const [category, setCategory] = useState<StaffDocumentCategory>(fixedCategory ?? categories[0] ?? "other");
  const [documentDate, setDocumentDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractNotConfigured, setExtractNotConfigured] = useState(false);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  // This modal instance is reused for every slot/document, so its fields
  // need a clean slate each time it's opened rather than carrying over
  // whatever the previous upload left behind.
  useEffect(() => {
    if (!open) return;
    setCategory(fixedCategory ?? categories[0] ?? "other");
    setDocumentDate("");
    setExpiryDate("");
    setSelectedFile(null);
    setExtractError(null);
    setExtractNotConfigured(false);
    setLowConfidenceFields([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setExtractError(null);
    setExtractNotConfigured(false);
    setLowConfidenceFields([]);
    setSelectedFile(e.target.files?.[0] ?? null);
  }

  function handleReadFromPhoto() {
    if (!selectedFile) return;
    setExtractError(null);
    setExtractNotConfigured(false);
    setLowConfidenceFields([]);
    setExtracting(true);

    const extractFormData = new FormData();
    extractFormData.set("file", selectedFile);

    extractStaffDocumentFromPhoto(extractFormData).then((result) => {
      setExtracting(false);
      if (!result.success) {
        setExtractError(result.error);
        setExtractNotConfigured(Boolean(result.notConfigured));
        return;
      }
      const { draft } = result;
      if (!fixedCategory && draft.category_guess && categories.includes(draft.category_guess)) {
        setCategory(draft.category_guess);
      }
      if (draft.document_date_guess) setDocumentDate(draft.document_date_guess);
      if (draft.expiry_date_guess) setExpiryDate(draft.expiry_date_guess);
      setLowConfidenceFields(draft.low_confidence_fields);
    });
  }

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

  const canReadPhoto = selectedFile !== null && EXTRACTABLE_IMAGE_TYPES.has(selectedFile.type);

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
            <select
              id="category"
              name="category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as StaffDocumentCategory)}
            >
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
            onChange={handleFileChange}
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-burgundy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-burgundy-600"
          />
          <p className="mt-1 text-xs text-charcoal/40">PDF, Word or image. Up to 50MB.</p>

          {canReadPhoto && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={extracting}
                onClick={handleReadFromPhoto}
                className="btn-secondary text-xs disabled:opacity-60"
              >
                {extracting ? "Reading photo…" : "✨ Read from photo"}
              </button>
              <span className="text-xs text-charcoal/40">
                Fills in the type and dates below for you to check before uploading.
              </span>
            </div>
          )}

          {extractError && (
            <p className="mt-1.5 text-xs text-status-action">
              {extractError}
              {!extractNotConfigured && " You can still fill this in by hand below."}
            </p>
          )}

          {lowConfidenceFields.length > 0 && (
            <p className="mt-1.5 rounded-lg border border-status-attention/30 bg-status-attentionBg px-2.5 py-1.5 text-xs text-charcoal/70">
              The photo wasn&apos;t fully clear on:{" "}
              {lowConfidenceFields.map((f) => LOW_CONFIDENCE_LABELS[f] ?? f).join(", ")}. Double-check these against
              the photo before uploading.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="document_date">
              Date completed (optional)
            </label>
            <input
              id="document_date"
              name="document_date"
              type="date"
              className="input"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="expiry_date">
              Next due / expiry (optional)
            </label>
            <input
              id="expiry_date"
              name="expiry_date"
              type="date"
              className="input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
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
