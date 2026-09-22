"use client";

import { useState } from "react";
import { AddStaffDocumentModal } from "./add-staff-document-modal";
import { UploadIcon } from "@/components/icons";
import type { RecordStaffDocumentFields, RecordStaffDocumentResult } from "@/lib/actions/staff";

// NOTE: this component isn't currently used anywhere in the app — the
// Required Documents panel on a staff profile renders AddStaffDocumentModal
// directly instead. Kept in sync with the modal's current props (rather
// than deleted) so it doesn't silently rot and break the build again if it
// gets picked up later.
export function AddStaffDocumentButton({
  onUpload,
}: {
  onUpload: (fields: RecordStaffDocumentFields) => Promise<RecordStaffDocumentResult>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <UploadIcon className="h-4 w-4" />
        Upload document
      </button>
      <AddStaffDocumentModal open={open} onClose={() => setOpen(false)} onUpload={onUpload} />
    </>
  );
}
