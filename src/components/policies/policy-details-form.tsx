"use client";

import { useState, useTransition } from "react";
import { POLICY_CATEGORIES, REVIEW_CYCLE_LABEL } from "@/lib/constants";
import type { PolicyReviewCycle } from "@/lib/supabase/database.types";

export function PolicyDetailsForm({
  title: initialTitle,
  category: initialCategory,
  description: initialDescription,
  reviewCycle: initialReviewCycle,
  nextReviewDate: initialNextReviewDate,
  onSave,
}: {
  title: string;
  category: string | null;
  description: string | null;
  reviewCycle: PolicyReviewCycle | null;
  nextReviewDate: string | null;
  onSave: (fields: {
    title?: string;
    category?: string | null;
    description?: string | null;
    review_cycle?: PolicyReviewCycle | null;
    next_review_date?: string | null;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [reviewCycle, setReviewCycle] = useState<PolicyReviewCycle | "">(initialReviewCycle ?? "");
  const [nextReviewDate, setNextReviewDate] = useState(initialNextReviewDate ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div>
        <label className="label">Category</label>
        <select
          className="input"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSaved(false);
          }}
        >
          <option value="">Uncategorised</option>
          {POLICY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[70px]"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Review cycle</label>
          <select
            className="input"
            value={reviewCycle}
            onChange={(e) => {
              setReviewCycle(e.target.value as PolicyReviewCycle | "");
              setSaved(false);
            }}
          >
            <option value="">Not set</option>
            {Object.entries(REVIEW_CYCLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Next review date</label>
          <input
            type="date"
            className="input"
            value={nextReviewDate}
            onChange={(e) => {
              setNextReviewDate(e.target.value);
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              await onSave({
                title,
                category: category || null,
                description: description || null,
                review_cycle: reviewCycle || null,
                next_review_date: nextReviewDate || null,
              });
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
