"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/lib/utils";

export function ReviewInfoPanel({
  criterionId,
  criterionCode,
  lastReviewedAt,
  nextReviewDate,
  reviewedByName,
  onSave,
}: {
  criterionId: string;
  criterionCode: string;
  lastReviewedAt: string | null;
  nextReviewDate: string | null;
  reviewedByName: string | null;
  onSave: (
    criterionId: string,
    criterionCode: string,
    fields: { last_reviewed_at: string | null; next_review_date: string | null }
  ) => Promise<void>;
}) {
  const [lastReviewed, setLastReviewed] = useState(lastReviewedAt ?? "");
  const [nextReview, setNextReview] = useState(nextReviewDate ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Last reviewed</label>
        <input
          type="date"
          className="input"
          value={lastReviewed}
          onChange={(e) => {
            setLastReviewed(e.target.value);
            setSaved(false);
          }}
        />
      </div>
      <div>
        <label className="label">Next review date</label>
        <input
          type="date"
          className="input"
          value={nextReview}
          onChange={(e) => {
            setNextReview(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <p className="text-xs text-ocean-500">
          {reviewedByName ? `Last set by ${reviewedByName}` : "Not yet reviewed"}
        </p>
        <button
          type="button"
          disabled={pending}
          className="btn-secondary"
          onClick={() =>
            startTransition(async () => {
              await onSave(criterionId, criterionCode, {
                last_reviewed_at: lastReviewed || null,
                next_review_date: nextReview || null,
              });
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save review info"}
        </button>
      </div>

      {(lastReviewedAt || nextReviewDate) && (
        <p className="sm:col-span-2 text-xs text-ocean-400">
          Currently on record: last reviewed {formatDate(lastReviewedAt)}, next review {formatDate(nextReviewDate)}.
        </p>
      )}
    </div>
  );
}
