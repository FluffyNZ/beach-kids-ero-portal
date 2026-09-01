"use client";

import { useState } from "react";
import { UploadEvidenceModal } from "./upload-modal";
import { UploadIcon } from "@/components/icons";

export function UploadEvidenceButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <UploadIcon className="h-4 w-4" />
        Upload evidence
      </button>
      <UploadEvidenceModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
