"use client";

import { useState, useTransition } from "react";
import type { ChecklistItem } from "@/lib/types";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";

export function ChecklistItemsPanel({
  criterionId,
  criterionCode,
  items,
  onAdd,
  onToggle,
  onDelete,
}: {
  criterionId: string;
  criterionCode: string;
  items: ChecklistItem[];
  onAdd: (criterionId: string, criterionCode: string, description: string) => Promise<void>;
  onToggle: (itemId: string, criterionCode: string, checked: boolean) => Promise<void>;
  onDelete: (itemId: string, criterionCode: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-ocean-500">
          No Beach Kids readiness items yet — add the internal checks you want ready for this criterion.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="group flex items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-ocean-50/60">
              <input
                type="checkbox"
                checked={item.is_checked}
                onChange={(e) =>
                  startTransition(() => onToggle(item.id, criterionCode, e.target.checked))
                }
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ocean-300 text-ocean-600 focus:ring-ocean-500"
              />
              <div className="min-w-0 flex-1">
                <p className={item.is_checked ? "text-sm text-ocean-400 line-through" : "text-sm text-ocean-900"}>
                  {item.description}
                </p>
                {item.is_checked && item.checked_at && (
                  <p className="text-xs text-ocean-400">
                    Checked {formatDate(item.checked_at)}
                    {item.checked_by_name ? ` by ${item.checked_by_name}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => onDelete(item.id, criterionCode))}
                className="shrink-0 rounded p-1 text-ocean-300 opacity-0 hover:text-status-action group-hover:opacity-100"
                aria-label="Remove item"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          const description = draft;
          setDraft("");
          startTransition(() => onAdd(criterionId, criterionCode, description));
        }}
      >
        <input
          type="text"
          className="input"
          placeholder="Add a readiness item…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={pending || !draft.trim()} className="btn-secondary shrink-0">
          <PlusIcon />
          Add
        </button>
      </form>
    </div>
  );
}
