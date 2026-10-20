"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraftPost } from "@/lib/actions/marketing";

export function CreatePostButton({ className = "btn-primary" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const { id } = await createDraftPost({});
              router.push(`/marketing/posts/${id}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create a new draft.");
            }
          })
        }
      >
        {pending ? "Creating…" : "+ Create post"}
      </button>
      {error && <p className="text-xs text-status-action">{error}</p>}
    </div>
  );
}
