"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHazardLogEntry, setHazardLogEntryResolved, deleteHazardLogEntry } from "@/lib/actions/hazard-checks";
import { StatusBadge } from "@/components/status-badge";
import { HAZARD_RISK_LABEL, hazardRiskTone } from "@/lib/constants";
import { TrashIcon, PlusIcon } from "@/components/icons";
import type { HazardLogEntry } from "@/lib/types";

/** The "Hazard & location / Risk / Resolved" section embedded on every
 * Daily Hazard Checklist — this is also the raw material behind the
 * Hazard Register. An entry left unresolved here is what surfaces as a job
 * on the dashboard, so marking one resolved (or deleting one logged by
 * mistake) takes effect immediately rather than waiting on the rest of the
 * form to be saved. */
export function HazardLogSection({ checkId, entries }: { checkId: string; entries: HazardLogEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await addHazardLogEntry(checkId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
      setAdding(false);
      router.refresh();
    });
  }

  function toggleResolved(id: string, resolved: boolean) {
    startTransition(async () => {
      await setHazardLogEntryResolved(id, resolved, checkId);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHazardLogEntry(id, checkId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 && !adding && <p className="text-sm text-charcoal/50">No hazards logged for this check.</p>}

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-charcoal/10 p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={hazardRiskTone(entry.risk_level)}>{HAZARD_RISK_LABEL[entry.risk_level]} risk</StatusBadge>
              <StatusBadge tone={entry.resolved ? "ready" : "action"}>{entry.resolved ? "Resolved" : "Open"}</StatusBadge>
            </div>
            <p className="mt-1.5 text-sm text-charcoal">{entry.hazard_description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => toggleResolved(entry.id, !entry.resolved)}
              className="text-xs font-medium text-burgundy-600 hover:underline disabled:opacity-50"
            >
              {entry.resolved ? "Reopen" : "Mark resolved"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(entry.id)}
              className="text-charcoal/30 hover:text-status-action disabled:opacity-50"
              aria-label="Delete this hazard log entry"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border border-charcoal/10 p-3">
          <div>
            <label className="label" htmlFor="hazard_description">
              Hazard &amp; location
            </label>
            <textarea
              id="hazard_description"
              name="hazard_description"
              rows={2}
              required
              className="input"
              placeholder="e.g. Loose paving stone by the gate"
            />
          </div>
          <div className="max-w-[10rem]">
            <label className="label" htmlFor="risk_level">
              Risk
            </label>
            <select id="risk_level" name="risk_level" defaultValue="low" className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {error && <p className="text-sm text-status-action">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Log hazard"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 self-start text-sm font-medium text-burgundy-600 hover:underline"
        >
          <PlusIcon className="h-4 w-4" /> Log a hazard
        </button>
      )}
    </div>
  );
}
