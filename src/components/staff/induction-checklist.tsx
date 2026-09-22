"use client";

import { useMemo, useState, useTransition } from "react";
import { STAFF_INDUCTION_SECTIONS, getStaffInductionTotalItemCount } from "@/lib/staff-induction-checklist";
import { toggleInductionItem } from "@/lib/actions/induction";
import { InductionSignBlock } from "./induction-sign-block";

export function InductionChecklist({
  staffId,
  checkedKeys,
  staffSignature,
  managerSignature,
  completed,
}: {
  staffId: string;
  checkedKeys: string[];
  staffSignature: { name: string | null; url: string | null; signedAt: string | null };
  managerSignature: { name: string | null; url: string | null; signedAt: string | null };
  completed: boolean;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(checkedKeys));
  const [, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const totalItems = useMemo(() => getStaffInductionTotalItemCount(), []);
  const checkedCount = checked.size;
  const percent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  // Which sections start open — decided once from the page's initial state,
  // never recomputed as boxes get ticked. <details open> is otherwise a
  // React-controlled attribute: recalculating "complete" live and feeding
  // it back into `open` on every render would force a section shut (or
  // back open) out from under someone who'd manually toggled it themselves.
  const initiallyOpenSections = useMemo(() => {
    const initial = new Set(checkedKeys);
    return new Set(
      STAFF_INDUCTION_SECTIONS.filter((section) => !section.items.every((item) => initial.has(item.key))).map(
        (section) => section.key
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggle(itemKey: string, next: boolean) {
    setErrorKey(null);
    setChecked((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(itemKey);
      else updated.delete(itemKey);
      return updated;
    });

    startTransition(async () => {
      const result = await toggleInductionItem(staffId, itemKey, next);
      if (!result.success) {
        // Roll back — the save didn't actually happen.
        setChecked((prev) => {
          const reverted = new Set(prev);
          if (next) reverted.delete(itemKey);
          else reverted.add(itemKey);
          return reverted;
        });
        setErrorKey(itemKey);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-charcoal">
            {checkedCount} of {totalItems} items ticked
          </p>
          <span className="text-sm font-semibold text-charcoal">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/10">
          <div
            className={`h-full rounded-full transition-all ${completed ? "bg-status-ready" : "bg-ocean-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {completed && (
          <p className="text-xs font-medium text-status-ready">
            Induction complete — every item is ticked and the staff member has signed.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {STAFF_INDUCTION_SECTIONS.map((section) => {
          const sectionCheckedCount = section.items.filter((item) => checked.has(item.key)).length;
          const sectionComplete = sectionCheckedCount === section.items.length;
          return (
            <details
              key={section.key}
              className="card overflow-hidden p-0"
              open={initiallyOpenSections.has(section.key)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:content-none">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{section.title}</p>
                  {section.description && <p className="mt-0.5 text-xs text-charcoal/50">{section.description}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    sectionComplete ? "bg-status-readyBg text-status-ready" : "bg-charcoal/5 text-charcoal/50"
                  }`}
                >
                  {sectionCheckedCount}/{section.items.length}
                </span>
              </summary>
              <ul className="flex flex-col divide-y divide-charcoal/5 border-t border-charcoal/10">
                {section.items.map((item) => (
                  <li key={item.key} className="flex items-start gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={checked.has(item.key)}
                      onChange={(e) => handleToggle(item.key, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-ocean-300 text-ocean-600 focus:ring-ocean-500"
                    />
                    <label htmlFor={item.key} className="text-sm text-charcoal/80">
                      {item.text}
                    </label>
                  </li>
                ))}
              </ul>
              {errorKey && section.items.some((i) => i.key === errorKey) && (
                <p className="border-t border-charcoal/10 px-4 py-2 text-xs text-status-action">
                  Couldn&apos;t save that tick — check your connection and try again.
                </p>
              )}
            </details>
          );
        })}
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-charcoal">Sign-off</h2>
          <p className="mt-0.5 text-xs text-charcoal/50">
            Matches the pack&apos;s own final sign-off — a drawn signature from the staff member, plus an optional
            manager/overseer sign-off, rather than the pack&apos;s two separate signing pages.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <InductionSignBlock
            staffId={staffId}
            who="staff"
            label="Staff member signature"
            helpText="I confirm I've read, understood and been inducted on everything above."
            signature={staffSignature}
          />
          <InductionSignBlock
            staffId={staffId}
            who="manager"
            label="Overseen by (manager)"
            helpText="Confirms the induction was carried out and witnessed."
            signature={managerSignature}
          />
        </div>
      </div>
    </div>
  );
}
