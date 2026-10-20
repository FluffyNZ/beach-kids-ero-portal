"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraftFromSuggestion, dismissSuggestion } from "@/lib/actions/marketing";
import type { MarketingSuggestion } from "@/lib/types";

export function SuggestionCard({ suggestion }: { suggestion: MarketingSuggestion }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"create" | "dismiss" | null>(null);

  return (
    <div className="card flex flex-col gap-2 p-4">
      <p className="text-sm font-semibold text-charcoal">{suggestion.title}</p>
      <p className="text-xs text-charcoal/55">{suggestion.description}</p>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          disabled={pending}
          className="btn-primary flex-1 text-xs"
          onClick={() =>
            startTransition(async () => {
              setBusy("create");
              const { id } = await createDraftFromSuggestion(suggestion.key, suggestion.suggestedCaption);
              router.push(`/marketing/posts/${id}`);
            })
          }
        >
          {busy === "create" && pending ? "Creating…" : "Create draft"}
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-ghost text-xs"
          onClick={() =>
            startTransition(async () => {
              setBusy("dismiss");
              await dismissSuggestion(suggestion.key);
              router.refresh();
            })
          }
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
