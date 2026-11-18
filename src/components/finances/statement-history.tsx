import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDateTime } from "@/lib/finance-format";
import type { StatementSend } from "@/lib/data/finance-hub";

export function StatementHistory({ sends }: { sends: StatementSend[] }) {
  return (
    <Panel title="Statements sent" count={sends.length} description="Statements sent before November 2026 weren't recorded." bodyClassName="">
      {sends.length === 0 ? (
        <EmptyState title="No statements recorded" description="Statements sent from Earlydesk will be listed here." />
      ) : (
        <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {sends.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal">{s.subject}</p>
                <p className="text-xs text-charcoal/70">
                  {fmtDateTime(s.sentAt ?? s.createdAt)} · to {s.recipient}
                  {s.error ? ` · ${s.error}` : ""}
                </p>
              </div>
              <StatusPill tone={s.status === "sent" ? "ready" : s.status === "failed" ? "action" : "neutral"}>
                {s.status === "sent" ? "Sent" : s.status === "failed" ? "Not sent" : "Sending"}
              </StatusPill>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
