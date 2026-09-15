"use client";

import { useState } from "react";
import { LEARNING_STORY_WRITING_PROMPTS } from "@/lib/constants";

/** Optional prompts to help a kaiako get started — writing assistance
 * only. They're never inserted as headings in the published story. */
export function WritingPromptsPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-ocean-100 bg-ocean-50/40 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold uppercase tracking-wide text-ocean-600">
        {open ? "Hide" : "Need a hand starting?"} — writing prompts {open ? "▲" : "▼"}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ocean-800">
          {LEARNING_STORY_WRITING_PROMPTS.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
