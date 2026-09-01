"use client";

import { useState } from "react";
import { AddStaffDocumentModal } from "./add-staff-document-modal";
import { UploadIcon } from "@/components/icons";
import type { UploadStaffDocumentResult } from "@/lib/actions/staff";

export function AddStaffDocumentButton({
  onUpload,
}: {
  onUpload: (formData: FormData) => Promise<UploadStaffDocumentResult>;
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
