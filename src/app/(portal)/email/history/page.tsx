import Link from "next/link";
import { getEmailHistory, getEmailTemplates } from "@/lib/data/email";
import { HistoryFilterBar } from "@/components/email/history-filter-bar";
import { StatusBadge } from "@/components/status-badge";
import { MailIcon } from "@/components/icons";
import { formatDateTime } from "@/lib/utils";
import { EMAIL_MESSAGE_STATUS_LABEL, emailMessageStatusTone } from "@/lib/constants";
import type { EmailMessageStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: EmailMessageStatus[] = ["draft", "sending", "sent", "failed"];

export default async function EmailHistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; template?: string };
}) {
  const status = searchParams.status && VALID_STATUSES.includes(searchParams.status as EmailMessageStatus)
    ? (searchParams.status as EmailMessageStatus)
    : undefined;

  const [history, templates] = await Promise.all([
    getEmailHistory({ search: searchParams.q, status, templateKey: searchParams.template }),
    getEmailTemplates(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Email history</h1>
          <p className="mt-1 text-sm text-charcoal/60">Every email drafted or sent through Beach Kids — most recent 300.</p>
        </div>
        <Link href="/email" className="btn-ghost">
          Back to Email
        </Link>
      </div>

      <HistoryFilterBar templates={templates} />

      {history.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-5 py-12 text-center">
          <MailIcon className="h-7 w-7 text-charcoal/20" />
          <p className="text-sm font-medium text-charcoal">No emails match</p>
          <p className="text-xs text-charcoal/45">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="card flex flex-col divide-y divide-charcoal/5">
          {history.map((m) => (
            <Link
              key={m.id}
              href={`/email/compose?draftId=${m.id}`}
              className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-charcoal/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{m.subject}</p>
                <p className="truncate text-xs text-charcoal/50">
                  {m.recipient_name ? `${m.recipient_name} · ` : ""}
                  {m.recipient_email}
                  {m.child_name ? ` · ${m.child_name}` : ""}
                  {m.staff_name ? ` · ${m.staff_name}` : ""}
                  {m.template_label ? ` · ${m.template_label}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge tone={emailMessageStatusTone(m.status)}>{EMAIL_MESSAGE_STATUS_LABEL[m.status]}</StatusBadge>
                <span className="text-xs text-charcoal/40">{formatDateTime(m.sent_at ?? m.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
