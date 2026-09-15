"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setHazardLogEntryResolved } from "@/lib/actions/hazard-checks";
import { StatusBadge } from "@/components/status-badge";
import { HAZARD_RISK_LABEL, hazardRiskTone } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";
import type { HazardRegisterEntry } from "@/lib/types";

export function HazardRegisterList({ entries }: { entries: HazardRegisterEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleResolved(id: string, resolved: boolean, checkId: string) {
    startTransition(async () => {
      await setHazardLogEntryResolved(id, resolved, checkId);
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return (
      <div className="card flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-readyBg text-status-ready">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-charcoal">Nothing here</p>
          <p className="text-xs text-charcoal/50">No hazards match these filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={hazardRiskTone(entry.risk_level)}>{HAZARD_RISK_LABEL[entry.risk_level]} risk</StatusBadge>
              <StatusBadge tone={entry.resolved ? "ready" : "action"}>{entry.resolved ? "Resolved" : "Open"}</StatusBadge>
            </div>
            <p className="mt-1 truncate text-sm text-charcoal">{entry.hazard_description}</p>
            <p className="mt-0.5 text-xs text-charcoal/50">
              <Link href={`/records/hazards/${entry.check_id}`} className="hover:underline">
                {entry.room_name} · Week of {formatShortDate(entry.week_start_date)}
              </Link>
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => toggleResolved(entry.id, !entry.resolved, entry.check_id)}
            className="shrink-0 text-xs font-medium text-burgundy-600 hover:underline disabled:opacity-50"
          >
            {entry.resolved ? "Reopen" : "Mark resolved"}
          </button>
        </div>
      ))}
    </div>
  );
}
