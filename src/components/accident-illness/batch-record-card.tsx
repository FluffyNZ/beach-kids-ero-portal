"use client";

import { useState } from "react";
import Link from "next/link";
import { RecordForm } from "./record-form";
import { StatusBadge } from "@/components/status-badge";
import type { AccidentIllnessDraft, ChildMember, RosterRoom, StaffMember } from "@/lib/types";

/** One photo's worth of a batch import — its own draft, reviewed and saved
 * independently of every other card in the queue. Collapses to a compact
 * "saved" summary once its record exists, so a long batch doesn't turn into
 * a wall of finished forms. */
export function BatchRecordCard({
  file,
  previewUrl,
  draft,
  allChildren,
  rooms,
  staff,
  onRemove,
}: {
  file: File;
  previewUrl: string;
  draft: AccidentIllnessDraft;
  allChildren: ChildMember[];
  rooms: RosterRoom[];
  staff: StaffMember[];
  onRemove: () => void;
}) {
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  if (savedRecordId) {
    return (
      <div className="card flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-charcoal/10 object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">{file.name}</p>
          <p className="text-xs text-charcoal/50">Saved</p>
        </div>
        <StatusBadge tone="ready">Saved</StatusBadge>
        <Link href={`/records/accidents-illness/${savedRecordId}`} className="btn-ghost text-xs">
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
            alt="Photo of the paper form"
            className="h-16 w-16 shrink-0 rounded-lg border border-charcoal/10 object-cover"
          />
          <p className="text-xs text-charcoal/40">{file.name}</p>
        </div>
        <button type="button" onClick={onRemove} className="btn-ghost text-xs text-charcoal/50">
          Remove
        </button>
      </div>

      <RecordForm
        allChildren={allChildren}
        rooms={rooms}
        staff={staff}
        prefill={draft}
        photoFile={file}
        onSaved={setSavedRecordId}
      />
    </div>
  );
}
