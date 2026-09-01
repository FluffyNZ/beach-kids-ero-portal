"use client";

import { useState } from "react";
import { AddVersionModal } from "./add-version-modal";
import { UploadIcon } from "@/components/icons";
import type { AddVersionResult } from "@/lib/actions/policies";

export function AddVersionButton({ onUpload }: { onUpload: (formData: FormData) => Promise<AddVersionResult> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <UploadIcon className="h-4 w-4" />
        Add new version
      </button>
      <AddVersionModal open={open} onClose={() => setOpen(false)} onUpload={onUpload} />
    </>
  );
}
