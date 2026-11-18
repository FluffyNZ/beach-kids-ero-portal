import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import type { AttentionItem, AttentionUrgency } from "@/lib/data/home-dashboard";

const URGENCY_TONE: Record<AttentionUrgency, PillTone> = { high: "action", medium: "attention", low: "neutral" };
const URGENCY_WORD: Record<AttentionUrgency, string> = { high: "Urgent", medium: "Soon", low: "When you can" };

const VISIBLE = 6;

function Row({ item }: { item: AttentionItem }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${
            item.urgency === "high" ? "bg-status-action" : item.urgency === "medium" ? "bg-status-attention" : "bg-charcoal/15"
          }`}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/65">{item.category}</p>
          <p className="mt-0.5 text-[0.9375rem] font-medium leading-snug text-charcoal">{item.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-charcoal/70">
            {item.context && <span>{item.context}</span>}
            <StatusPill tone={URGENCY_TONE[item.urgency]}>
              <span className="sr-only">{URGENCY_WORD[item.urgency]}: </span>
              {item.when ?? URGENCY_WORD[item.urgency]}
            </StatusPill>
          </div>
        </div>
      </div>
      <Link href={item.href} className="btn-secondary shrink-0 self-start px-3.5 py-2 text-sm sm:self-center">
        {item.actionLabel}
      </Link>
    </li>
  );
}

/** Needs attention: the most pressing things first (urgent, then soon,
 * then when-you-can), each with what it's about, when it's due and a
 * direct action. The first few are shown; the rest are one click away. */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const shown = items.slice(0, VISIBLE);
  const rest = items.slice(VISIBLE);

  return (
    <Panel
      id="needs-attention"
      title="Needs attention"
      count={items.length}
      description={items.length > 0 ? "Most urgent first." : undefined}
      className="scroll-mt-6"
    >
      {items.length === 0 ? (
        <EmptyState
          tone="positive"
          title="Nothing needs attention right now"
          description="Overdue tasks, hazards, documents due and roster gaps will appear here."
        />
      ) : (
        <>
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
            {shown.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
          {rest.length > 0 && (
            <details className="group border-t border-charcoal/10">
              <summary className="cursor-pointer list-none rounded-b-2xl px-5 py-3 text-sm font-medium text-lilac-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lilac-700 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">View all {items.length} items</span>
                <span className="hidden group-open:inline">Show fewer</span>
              </summary>
              <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
                {rest.map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </Panel>
  );
}
