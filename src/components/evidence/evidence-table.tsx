"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { EyeIcon, DownloadIcon } from "@/components/icons";
import { getSignedUrlForEvidence } from "@/lib/actions/evidence";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { formatDate, formatFileSize } from "@/lib/utils";
import { EvidenceDetailModal } from "./evidence-detail-modal";
import type { EvidenceItem } from "@/lib/types";

export function EvidenceTable({ evidence }: { evidence: EvidenceItem[] }) {
  const [selected, setSelected] = useState<EvidenceItem | null>(null);

  async function openFile(e: React.MouseEvent, storagePath: string, download: boolean) {
    e.stopPropagation();
    const url = await getSignedUrlForEvidence(storagePath, download);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  if (evidence.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-ocean-500">
        No evidence found. Try a different search, or upload a new document.
      </div>
    );
  }

  return (
    <>
      <div className="card divide-y divide-ocean-50">
        {evidence.map((e) => {
          const alert = getDeadlineAlert(e.review_date, e.expiry_date);
          return (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(e)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  setSelected(e);
                }
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-ocean-50/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ocean-950">{e.title}</p>
                <p className="mt-0.5 truncate text-xs text-ocean-500">
                  {e.category ?? "Uncategorised"} · {formatFileSize(e.file_size_bytes)} · uploaded{" "}
                  {formatDate(e.uploaded_at)}
                  {e.uploaded_by_name ? ` by ${e.uploaded_by_name}` : ""}
                </p>
                {e.linked_criteria.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.linked_criteria.slice(0, 6).map((l) => (
                      <span key={l.link_id} className="rounded-full bg-ocean-50 px-2 py-0.5 text-[11px] font-medium text-ocean-700">
                        {l.code}
                      </span>
                    ))}
                    {e.linked_criteria.length > 6 && (
                      <span className="text-[11px] text-ocean-400">+{e.linked_criteria.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}
                <button
                  type="button"
                  className="rounded-lg p-2 text-ocean-500 hover:bg-white"
                  title="Preview"
                  onClick={(ev) => openFile(ev, e.storage_path, false)}
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-ocean-500 hover:bg-white"
                  title="Download"
                  onClick={(ev) => openFile(ev, e.storage_path, true)}
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <EvidenceDetailModal evidence={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </>
  );
}
