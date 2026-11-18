import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailPage } from "@/components/email/email-page";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getEmailOverview } from "@/lib/data/email-hub";
import { EMAIL_REMINDER_TEMPLATE_KEY } from "@/lib/constants";
import { MESSAGE_STATUS } from "@/lib/email-format";
import { fmtDate, fmtDateTime } from "@/lib/finance-format";

export const dynamic = "force-dynamic";

const KIND_LABEL = { birthday: "Birthday", welcome: "Starting", farewell: "Leaving" } as const;

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">{children}</p>;
}

export default async function EmailOverviewPage({ searchParams }: { searchParams: { childId?: string } }) {
  if (searchParams.childId) redirect(`/email/compose?childId=${searchParams.childId}`);
  const o = await getEmailOverview();

  return (
    <EmailPage title="Email" description="Email families, staff and enquiries as Beach Kids.">
      {o.reminders.length > 0 && (
        <Panel title="Coming up this week" count={o.reminders.length} description="Birthdays, first days and last days in the next 7 days" bodyClassName="">
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
            {o.reminders.map((r) => {
              const href =
                r.alreadyHandled === "draft" && r.draftEmailId
                  ? `/email/compose?draftId=${r.draftEmailId}`
                  : `/email/compose?template=${EMAIL_REMINDER_TEMPLATE_KEY[r.kind]}&childId=${r.childId}&reminderKind=${r.kind}&reminderDate=${r.date}`;
              return (
                <li key={`${r.kind}-${r.childId}-${r.date}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-charcoal">
                      {r.childName}
                      {r.kind === "birthday" && r.turningAge !== null ? ` turns ${r.turningAge}` : ""}
                    </span>
                    <span className="block text-xs text-charcoal/70">
                      {KIND_LABEL[r.kind]} · {r.isToday ? "today" : fmtDate(r.date)}
                      {r.roomName ? ` · ${r.roomName}` : ""}
                    </span>
                  </span>
                  {r.alreadyHandled === "sent" ? (
                    <StatusPill tone="ready">Email sent</StatusPill>
                  ) : (
                    <Link href={href} className="btn-secondary px-3 py-1.5">
                      {r.alreadyHandled === "draft" ? "Continue draft" : `Write ${KIND_LABEL[r.kind].toLowerCase()} email`}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Panel title="Drafts to continue" count={o.drafts.length} action={o.drafts.length ? { label: "All drafts", href: "/email/history?status=draft" } : undefined} bodyClassName="">
          {o.drafts.length === 0 ? (
            <Empty>No drafts waiting.</Empty>
          ) : (
            <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
              {o.drafts.slice(0, 5).map((d) => (
                <li key={d.leadId}>
                  <Link href={`/email/compose?draftId=${d.leadId}`} className="block px-5 py-3 hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-charcoal">{d.subject || "(no subject)"}</span>
                      {d.failed && <StatusPill tone="action">Not sent</StatusPill>}
                    </span>
                    <span className="block truncate text-xs text-charcoal/70">
                      To {d.count === 1 ? d.recipients[0] : `${d.count} recipients`} · saved {fmtDateTime(d.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Enquiries" count={o.counts.openEnquiries} action={{ label: "All enquiries", href: "/email/enquiries" }} bodyClassName="">
          {o.enquiries.length === 0 ? (
            <Empty>No open enquiries.</Empty>
          ) : (
            <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
              {o.enquiries.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/email/enquiries?open=${e.id}`} className="min-w-0 text-sm hover:underline">
                    <span className="block truncate font-medium text-charcoal">{e.parent_full_name}</span>
                    <span className="block truncate text-xs text-charcoal/70">
                      For {e.child_full_name} · added {fmtDate(e.created_at.slice(0, 10))}
                    </span>
                  </Link>
                  {e.awaitingReply ? (
                    <Link href={`/email/compose?familyEnquiryId=${e.id}`} className="btn-secondary shrink-0 px-3 py-1">
                      Reply
                    </Link>
                  ) : (
                    <span className="shrink-0 text-xs text-charcoal/70">Replied</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent emails" action={{ label: "History", href: "/email/history" }} bodyClassName="">
          {o.recent.length === 0 ? (
            <Empty>Nothing sent yet.</Empty>
          ) : (
            <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
              {o.recent.map((m) => (
                <li key={m.id}>
                  <Link href={`/email/history?open=${m.id}`} className="block px-5 py-3 hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-charcoal">{m.subject}</span>
                      <StatusPill tone={MESSAGE_STATUS[m.status].tone}>{MESSAGE_STATUS[m.status].label}</StatusPill>
                    </span>
                    <span className="block truncate text-xs text-charcoal/70">
                      {m.recipientName ?? m.recipientEmail} · {fmtDateTime(m.sentAt ?? m.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-sm text-charcoal/70">
        {o.counts.sentLast30} sent in the last 30 days
        {o.counts.failed > 0 && (
          <>
            {" · "}
            <Link href="/email/history?status=failed" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
              {o.counts.failed} not sent
            </Link>
          </>
        )}
        {" · "}
        <Link href="/email/templates" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </p>
    </EmailPage>
  );
}
