import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import { CHILD_STATUS_LABEL, formatChildAge, getRoomColorClasses } from "@/lib/constants";
import type { ChildMember } from "@/lib/types";

export function ChildrenTable({ children }: { children: ChildMember[] }) {
  if (children.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-charcoal/50">
        No children found. Try a different search, or add a child.
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {children.map((c) => {
        const roomColors = getRoomColorClasses(c.room_color);
        return (
          <Link
            key={c.id}
            href={`/children/${c.id}`}
            className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-cream/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-charcoal">{c.full_name}</p>
                {c.room_name && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${roomColors.bg} ${roomColors.text}`}>
                    {c.room_name}
                  </span>
                )}
                {c.status === "left" && (
                  <span className="shrink-0 rounded-full bg-charcoal/5 px-2 py-0.5 text-[11px] font-medium text-charcoal/50">
                    {CHILD_STATUS_LABEL[c.status]}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal/50">
                {formatChildAge(c.age_years, c.age_months)} · {c.bill_payer_name ?? "No bill payer set"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!c.bill_payer_id && c.status === "active" && (
                <StatusBadge tone="attention">No bill payer</StatusBadge>
              )}
              {c.sibling_discount_eligible && <StatusBadge tone="neutral">Sibling discount</StatusBadge>}
              {c.twenty_hours_ece && <StatusBadge tone="ready">20 Hrs ECE</StatusBadge>}
              {c.has_winz_subsidy && <StatusBadge tone="neutral">WINZ</StatusBadge>}
              {c.special_weekly_override !== null && <StatusBadge tone="attention">Special rate</StatusBadge>}
              <ChevronRightIcon className="h-4 w-4 text-charcoal/20 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal/50" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
