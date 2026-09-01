"use client";

import { EyeIcon, DownloadIcon } from "@/components/icons";
import { getSignedUrlForStaffDocument } from "@/lib/actions/staff";

export function StaffDocumentRowActions({ storagePath }: { storagePath: string }) {
  async function openFile(download: boolean) {
    const url = await getSignedUrlForStaffDocument(storagePath, download);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className="rounded-lg p-2 text-charcoal/40 hover:bg-cream hover:text-charcoal"
        title="Preview"
        onClick={() => openFile(false)}
      >
        <EyeIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded-lg p-2 text-charcoal/40 hover:bg-cream hover:text-charcoal"
        title="Download"
        onClick={() => openFile(true)}
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
