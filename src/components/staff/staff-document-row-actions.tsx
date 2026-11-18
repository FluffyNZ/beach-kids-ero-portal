"use client";

import { useState } from "react";
import { EyeIcon, DownloadIcon } from "@/components/icons";
import { getSignedUrlForStaffDocument } from "@/lib/actions/staff";

/** Preview and Download for one stored staff file. Each click asks the
 * server for a short-lived signed link — the server decides whether this
 * account may open the file (contracts and confidential-note attachments
 * are restricted to authorised management). */
export function StaffDocumentRowActions({ storagePath, filename }: { storagePath: string; filename?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);

  async function openFile(download: boolean) {
    setError(null);
    setBusy(download ? "download" : "preview");
    try {
      const url = await getSignedUrlForStaffDocument(storagePath, download);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setError("This file couldn't be opened.");
    } catch {
      setError("This file couldn't be opened.");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal disabled:opacity-60";

  return (
    <div className="flex shrink-0 flex-col items-end">
      <div className="flex items-center gap-0.5">
        <button type="button" className={btn} disabled={busy !== null} onClick={() => openFile(false)}>
          <EyeIcon className="h-4 w-4" />
          {busy === "preview" ? "Opening…" : "Preview"}
          {filename && <span className="sr-only"> {filename}</span>}
        </button>
        <button type="button" className={btn} disabled={busy !== null} onClick={() => openFile(true)}>
          <DownloadIcon className="h-4 w-4" />
          {busy === "download" ? "Opening…" : "Download"}
          {filename && <span className="sr-only"> {filename}</span>}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-charcoal">
          {error}
        </p>
      )}
    </div>
  );
}
