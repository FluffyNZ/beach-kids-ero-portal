"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { LEARNING_STORY_STATUS_LABEL } from "@/lib/constants";
import type { LearningStoryStatusHistoryEntry } from "@/lib/types";

/** Tucked away by default, out of a kaiako's way while writing — but not
 * access-controlled, since Beach Kids currently runs on one shared login
 * with no real per-person permissions to hide it behind. */
export function AuditHistoryPanel({ history }: { history: LearningStoryStatusHistoryEntry[] }) {
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="border-t border-charcoal/10 pt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-charcoal/40 hover:text-charcoal/60">
        {open ? "Hide" : "Show"} audit history {open ? "▲" : "▼"}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-charcoal/50">
          {history.map((h) => (
            <li key={h.id}>
              {formatDateTime(h.changed_at)} — {h.from_status ? `${LEARNING_STORY_STATUS_LABEL[h.from_status]} → ` : ""}
              {LEARNING_STORY_STATUS_LABEL[h.to_status]}
              {h.changed_by_name ? ` by ${h.changed_by_name}` : ""}
              {h.comment ? `: "${h.comment}"` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
