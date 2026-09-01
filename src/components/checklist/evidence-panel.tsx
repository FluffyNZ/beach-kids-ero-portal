"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { UploadEvidenceModal } from "@/components/evidence/upload-modal";
import { LinkEvidenceModal } from "@/components/evidence/link-modal";
import { EvidenceDetailModal } from "@/components/evidence/evidence-detail-modal";
import { StatusBadge } from "@/components/status-badge";
import { UploadIcon, LinkIcon, EyeIcon, DownloadIcon, TrashIcon, LibraryIcon } from "@/components/icons";
import { unlinkEvidenceFromCriterion, getSignedUrlForEvidence } from "@/lib/actions/evidence";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { formatFileSize } from "@/lib/utils";
import type { EvidenceItem } from "@/lib/types";

export function EvidencePanel({
  criterionId,
  criterionCode,
  linkedEvidence,
  libraryEvidence,
}: {
  criterionId: string;
  criterionCode: string;
  linkedEvidence: EvidenceItem[];
  libraryEvidence: EvidenceItem[];
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selected, setSelected] = useState<EvidenceItem | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const linkedIds = new Set(linkedEvidence.map((e) => e.id));

  // Photos linked to this criterion are worth seeing right on the page —
  // fetch a signed thumbnail URL for each image up front instead of making
  // Ethan click through to a separate window just to see what it is.
  useEffect(() => {
    let cancelled = false;
    const imageItems = linkedEvidence.filter((e) => e.mime_type?.startsWith("image/"));
    if (imageItems.length === 0) return;

    Promise.all(
      imageItems.map(async (e) => [e.id, await getSignedUrlForEvidence(e.storage_path, false)] as const)
    ).then((pairs) => {
      if (cancelled) return;
      setPreviewUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of pairs) {
          if (url) next[id] = url;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [linkedEvidence]);

  async function openInNewTab(storagePath: string, download: boolean) {
    const url = await getSignedUrlForEvidence(storagePath, download);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-3">
      {criterionCode === "HS8" && (
        <div className="rounded-xl border border-ocean-100 bg-ocean-50/60 p-3 text-sm text-ocean-700">
          <p className="mb-2">
            Log emergency drills as structured records instead of uploading a plain file — each one can be
            printed and filed here automatically.
          </p>
          <Link href="/emergency-drills" className="btn-secondary">
            Open Emergency Drill Register
          </Link>
        </div>
      )}

      {linkedEvidence.length === 0 ? (
        <p className="text-sm text-ocean-500">No evidence linked to this criterion yet.</p>
      ) : (
        <ul className="divide-y divide-ocean-50 rounded-xl border border-ocean-100">
          {linkedEvidence.map((e) => {
            const alert = getDeadlineAlert(e.review_date, e.expiry_date);
            const linkId = e.linked_criteria.find((l) => l.criterion_id === criterionId)?.link_id;
            const isImage = e.mime_type?.startsWith("image/") ?? false;
            const previewUrl = previewUrls[e.id];
            return (
              <li
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
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-ocean-50/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ocean-100 bg-ocean-50">
                    {isImage && previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={e.title} className="h-full w-full object-cover" />
                    ) : (
                      <LibraryIcon className="h-5 w-5 text-ocean-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ocean-950">{e.title}</p>
                    <p className="truncate text-xs text-ocean-500">
                      {e.category ?? "Uncategorised"} · {formatFileSize(e.file_size_bytes)}
                    </p>
                    {alert && (
                      <StatusBadge tone={alert.tone} className="mt-1">
                        {alert.label}
                      </StatusBadge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-ocean-500 hover:bg-white"
                    title="View evidence"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelected(e);
                    }}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-ocean-500 hover:bg-white"
                    title="Download"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openInNewTab(e.storage_path, true);
                    }}
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                  {linkId && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-ocean-400 hover:bg-status-actionBg hover:text-status-action"
                      title="Remove link (keeps the original evidence)"
                      disabled={pending}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        startTransition(() => unlinkEvidenceFromCriterion(linkId, criterionCode));
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setUploadOpen(true)}>
          <UploadIcon className="h-4 w-4" />
          Upload evidence
        </button>
        <button type="button" className="btn-secondary" onClick={() => setLinkOpen(true)}>
          <LinkIcon className="h-4 w-4" />
          Link existing evidence
        </button>
      </div>

      <UploadEvidenceModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        criterionId={criterionId}
        criterionCode={criterionCode}
      />
      <LinkEvidenceModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        criterionId={criterionId}
        criterionCode={criterionCode}
        libraryEvidence={libraryEvidence}
        alreadyLinkedIds={linkedIds}
      />
      <EvidenceDetailModal evidence={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </div>
  );
}
