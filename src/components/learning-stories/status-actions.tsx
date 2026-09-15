"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitStory,
  approveAndPublishStory,
  returnStoryForChanges,
  archiveStory,
  deleteDraftStory,
} from "@/lib/actions/learning-stories";
import type { LearningStoryStatus } from "@/lib/supabase/database.types";

export function StatusActions({
  storyId,
  status,
  canPublishDirectly,
  reviewComments,
}: {
  storyId: string;
  status: LearningStoryStatus;
  canPublishDirectly: boolean;
  reviewComments: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [comment, setComment] = useState("");

  if (status === "draft" || status === "returned_for_editing") {
    return (
      <div className="flex flex-col gap-2">
        {status === "returned_for_editing" && reviewComments && (
          <p className="rounded-lg bg-status-attentionBg px-3 py-2 text-sm text-status-attention">
            Returned for changes: {reviewComments}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await submitStory(storyId);
                if (!result.success) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              })
            }
          >
            {pending ? "Saving…" : canPublishDirectly ? "Publish Story" : "Submit for Approval"}
          </button>
          {status === "draft" && (
            <button
              type="button"
              className="btn-ghost text-status-action hover:bg-status-actionBg"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Delete this draft? This can't be undone.")) return;
                startTransition(async () => {
                  const result = await deleteDraftStory(storyId);
                  if (result.success) router.push("/learning/stories");
                  else setError(result.error);
                });
              }}
            >
              Delete draft
            </button>
          )}
        </div>
        {error && <p className="text-sm text-status-action">{error}</p>}
      </div>
    );
  }

  if (status === "awaiting_approval") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await approveAndPublishStory(storyId);
                if (!result.success) setError(result.error);
                else router.refresh();
              })
            }
          >
            {pending ? "Saving…" : "Approve & Publish"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowReturnBox((v) => !v)}>
            Return for Changes
          </button>
          <p className="text-xs text-charcoal/40">Editing this page directly is also fine — that's the "Edit" option.</p>
        </div>
        {showReturnBox && (
          <div className="flex flex-col gap-2">
            <textarea
              className="input min-h-[70px]"
              placeholder="What needs to change?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await returnStoryForChanges(storyId, comment);
                    if (!result.success) setError(result.error);
                    else {
                      setShowReturnBox(false);
                      router.refresh();
                    }
                  })
                }
              >
                Send back for changes
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-status-action">{error}</p>}
      </div>
    );
  }

  if (status === "published") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await archiveStory(storyId);
              router.refresh();
            })
          }
        >
          {pending ? "Archiving…" : "Archive"}
        </button>
        {error && <p className="text-sm text-status-action">{error}</p>}
      </div>
    );
  }

  return <p className="text-sm text-charcoal/40">This story is archived.</p>;
}
