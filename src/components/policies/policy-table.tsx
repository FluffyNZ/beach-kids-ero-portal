import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { REVIEW_CYCLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { PolicyItem } from "@/lib/types";

export function PolicyTable({ policies }: { policies: PolicyItem[] }) {
  if (policies.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-charcoal/50">
        No policies found. Try a different search, or add a new policy.
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {policies.map((p) => {
        const alert = getDeadlineAlert(p.next_review_date, null);
        const hasApproved = p.current_version !== null;
        return (
          <Link
            key={p.id}
            href={`/policies/${p.id}`}
            className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-cream/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-charcoal">{p.title}</p>
                {p.current_version && (
                  <span className="shrink-0 rounded-full bg-charcoal/5 px-2 py-0.5 text-[11px] font-medium text-charcoal/50">
                    v{p.current_version.version_number}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal/50">
                {p.category ?? "Uncategorised"}
                {p.review_cycle ? ` · ${REVIEW_CYCLE_LABEL[p.review_cycle]} review` : ""} · {p.version_count} version
                {p.version_count === 1 ? "" : "s"} · updated {formatDate(p.updated_at)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!hasApproved && <StatusBadge tone="attention">No approved version</StatusBadge>}
              {alert && <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>}
              <ChevronRightIcon className="h-4 w-4 text-charcoal/20 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal/50" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
