"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { POLICY_CATEGORIES, REVIEW_CYCLE_LABEL } from "@/lib/constants";
import { createPolicy } from "@/lib/actions/policies";

export function NewPolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPolicy(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      onClose();
      router.push(`/policies/${result.policyId}`);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New policy">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="title">
            Policy title
          </label>
          <input id="title" name="title" type="text" required className="input" placeholder="e.g. Health and Safety Policy" />
        </div>

        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" className="input">
            <option value="">Select a category…</option>
            {POLICY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" className="input min-h-[60px]" placeholder="What this policy covers" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="review_cycle">
              Review cycle
            </label>
            <select id="review_cycle" name="review_cycle" className="input">
              <option value="">Not set</option>
              {Object.entries(REVIEW_CYCLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="next_review_date">
              Next review date
            </label>
            <input id="next_review_date" name="next_review_date" type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="file">
            First version (document)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-burgundy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-burgundy-600"
          />
          <p className="mt-1 text-xs text-charcoal/40">
            PDF, Word or image. Up to 50MB. This becomes version 1 — approve it once you&apos;re ready for it to
            go live.
          </p>
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Creating…" : "Create policy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
