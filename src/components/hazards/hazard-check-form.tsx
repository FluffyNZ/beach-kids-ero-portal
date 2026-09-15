"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHazardCheck } from "@/lib/actions/hazard-checks";
import { HAZARD_CATEGORY_LABEL } from "@/lib/constants";
import type { HazardCheck, HazardCheckCategory } from "@/lib/types";

const CATEGORY_ORDER: HazardCheckCategory[] = ["indoor", "outdoor", "allergy"];

/** The tick-box body of one week's Weekly Hazard Checklist, grouped exactly
 * as the paper form groups it (Indoor / Outdoor / Allergy), plus the
 * week's own Notes field. Saved as one submission, same as the rest of the
 * app's paper-form pages — not one request per checkbox. Each weekday's own
 * staff sign-off lives in its own HazardDailySignoffs section instead, since
 * a different person may sign a different day's column. */
export function HazardCheckForm({ check }: { check: HazardCheck }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const itemsByCategory = new Map<HazardCheckCategory, typeof check.items>();
  check.items.forEach((item) => {
    const list = itemsByCategory.get(item.category) ?? [];
    list.push(item);
    itemsByCategory.set(item.category, list);
  });

  // The checkboxes below are uncontrolled (defaultChecked) so typing in
  // Notes doesn't re-render the whole list — ticking/clearing all of them at
  // once just flips each checkbox's own checked state directly, the same
  // state Save reads off the form when it submits.
  function setAllChecked(value: boolean) {
    const boxes = formRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name^="item_checked_"]');
    boxes?.forEach((box) => {
      box.checked = value;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateHazardCheck(check.id, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="-mb-2 flex justify-end gap-3">
        <button type="button" onClick={() => setAllChecked(true)} className="text-xs font-medium text-burgundy-600 hover:underline">
          Tick all
        </button>
        <button type="button" onClick={() => setAllChecked(false)} className="text-xs font-medium text-charcoal/50 hover:underline">
          Clear all
        </button>
      </div>

      {CATEGORY_ORDER.filter((cat) => itemsByCategory.has(cat)).map((category) => (
        <div key={category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            {HAZARD_CATEGORY_LABEL[category]}
          </h3>
          <div className="flex flex-col gap-1.5">
            {(itemsByCategory.get(category) ?? []).map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-sm text-charcoal hover:bg-sand-50"
              >
                <input type="hidden" name="item_id" value={item.id} />
                <input
                  type="checkbox"
                  name={`item_checked_${item.id}`}
                  defaultChecked={item.is_checked}
                  className="mt-0.5 h-4 w-4 rounded"
                />
                {item.item_text}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={check.notes ?? ""} className="input" />
      </div>

      {error && <p className="text-sm text-status-action">{error}</p>}
      {saved && !error && <p className="text-sm text-status-ready">Saved.</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save check"}
        </button>
      </div>
    </form>
  );
}
