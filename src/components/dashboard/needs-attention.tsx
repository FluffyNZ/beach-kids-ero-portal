import Link from "next/link";
import type { NeedsAttentionItem } from "@/lib/data/dashboard";
import { AlertIcon, ChevronRightIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import type { StatusTone } from "@/lib/constants";

const KIND_LABEL: Record<NeedsAttentionItem["kind"], { label: string; tone: StatusTone }> = {
  no: { label: "Non-compliant", tone: "action" },
  unsure: { label: "Unsure", tone: "attention" },
  evidence_missing: { label: "Evidence missing", tone: "action" },
  action_overdue: { label: "Overdue action", tone: "action" },
  document_expiring: { label: "Document due", tone: "attention" },
  staff_document_due: { label: "Staff document due", tone: "attention" },
  staff_review_due: { label: "Qualification review due", tone: "attention" },
  emergency_drill_due: { label: "Drill due", tone: "attention" },
};

const TONE_ICON_CHIP: Record<StatusTone, string> = {
  ready: "bg-status-readyBg text-status-ready",
  attention: "bg-status-attentionBg text-status-attention",
  action: "bg-status-actionBg text-status-action",
  neutral: "bg-charcoal/5 text-charcoal/50",
};

export function NeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-readyBg text-status-ready">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-charcoal">All clear for now</p>
          <p className="text-xs text-charcoal/50">
            Nothing urgent — anything that needs a look will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {items.map((item, i) => {
        const meta = KIND_LABEL[item.kind];
        return (
          <Link
            key={`${item.kind}-${i}`}
            href={item.href}
            className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-sand-100"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_ICON_CHIP[meta.tone]}`}
              >
                <AlertIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{item.title}</p>
                <p className="truncate text-xs text-charcoal/50">{item.detail}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              <ChevronRightIcon className="h-4 w-4 text-charcoal/20 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal/50" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
