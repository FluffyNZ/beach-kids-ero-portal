"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraftStory } from "@/lib/actions/learning-stories";
import { PlusIcon } from "@/components/icons";

/** Creates an empty draft straight away and drops you into the editor —
 * title, date, author and children are filled in there, same as the rest
 * of this app's "new" buttons that go straight to a detail page. */
export function CreateStoryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createDraftStory();
            if (!result.success) {
              setError(result.error);
              return;
            }
            router.push(`/learning/stories/${result.storyId}`);
          })
        }
      >
        <PlusIcon className="h-4 w-4" />
        {pending ? "Creating…" : "Create Learning Story"}
      </button>
      {error && <p className="text-xs text-status-action">{error}</p>}
    </div>
  );
}
