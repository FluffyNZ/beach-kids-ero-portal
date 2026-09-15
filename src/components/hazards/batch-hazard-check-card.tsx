"use client";

import { useState } from "react";
import Link from "next/link";
import { HazardCheckImportForm } from "./hazard-check-import-form";
import { StatusBadge } from "@/components/status-badge";
import type { HazardCheckDraft, HazardChecklistTemplateItem, RosterRoom, StaffMember } from "@/lib/types";

/** One photo's worth of a hazard-check batch import — its own draft,
 * reviewed and saved independently of every other card in the queue.
 * Mirrors BatchRecordCard from Accident & Illness: collapses to a compact
 * "saved" summary once its check exists, so a long batch doesn't turn into
 * a wall of finished forms. */
export function BatchHazardCheckCard({
  file,
  previewUrl,
  draft,
  rooms,
  templatesByRoom,
  staff,
  onRemove,
}: {
  file: File;
  previewUrl: string;
  draft: HazardCheckDraft;
  rooms: RosterRoom[];
  templatesByRoom: Record<string, HazardChecklistTemplateItem[]>;
  staff: StaffMember[];
  onRemove: () => void;
}) {
  const [savedCheckId, setSavedCheckId] = useState<string | null>(null);

  if (savedCheckId) {
    return (
      <div className="card flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-charcoal/10 object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">{file.name}</p>
          <p className="text-xs text-charcoal/50">Saved</p>
        </div>
        <StatusBadge tone="ready">Saved</StatusBadge>
        <Link href={`/records/hazards/${savedCheckId}`} className="btn-ghost text-xs">
          View
        </Link>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Photo of the paper checklist"
            className="h-16 w-16 shrink-0 rounded-lg border border-charcoal/10 object-cover"
          />
          <p className="text-xs text-charcoal/40">{file.name}</p>
        </div>
        <button type="button" onClick={onRemove} className="btn-ghost text-xs text-charcoal/50">
          Remove
        </button>
      </div>

      <HazardCheckImportForm
        rooms={rooms}
        templatesByRoom={templatesByRoom}
        staff={staff}
        draft={draft}
        photoFile={file}
        onSaved={setSavedCheckId}
      />
    </div>
  );
}
