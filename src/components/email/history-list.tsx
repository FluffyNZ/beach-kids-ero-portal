"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { MESSAGE_STATUS, fileSize } from "@/lib/email-format";
import { fmtDateTime } from "@/lib/finance-format";
import type { MessageRow } from "@/lib/data/email-hub";

type Filters = { q: string; status: string; kind: string; days: string };

function setUrlParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url.toString());
}

export function MessageDetail({ m }: { m: MessageRow }) {
  const s = MESSAGE_STATUS[m.status];
  const links = [
    m.childId && m.childName ? { href: `/children/${m.childId}`, label: m.childName, kind: "Child" } : null,
    m.billPayerId && m.familyName ? { href: `/finances/clients/${m.billPayerId}`, label: m.familyName, kind: "Family account" } : null,
    m.staffId && m.staffName ? { href: `/staff/${m.staffId}`, label: m.staffName, kind: "Staff" } : null,
    m.enquiryId && m.enquiryName ? { href: `/email/enquiries?open=${m.enquiryId}`, label: m.enquiryName, kind: "Enquiry" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; kind: string }>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={s.tone}>{s.label}</StatusPill>
        <span className="text-sm text-charcoal/70">{s.detail}</span>
      </div>
      {m.error && (
        <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal">
          {m.error}
        </p>
      )}
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-charcoal/70">To</dt>
        <dd className="break-words text-charcoal">
          {m.recipientName ? `${m.recipientName} <${m.recipientEmail}>` : m.recipientEmail}
        </dd>
        <dt className="text-charcoal/70">Created</dt>
        <dd className="text-charcoal">{fmtDateTime(m.createdAt)}</dd>
        {m.sentAt && (
          <>
            <dt className="text-charcoal/70">Sent</dt>
            <dd className="text-charcoal">{fmtDateTime(m.sentAt)}</dd>
          </>
        )}
        {m.providerId && (
          <>
            <dt className="text-charcoal/70">Service reference</dt>
            <dd className="break-all font-mono text-xs text-charcoal">{m.providerId}</dd>
          </>
        )}
        {m.templateLabel && (
          <>
            <dt className="text-charcoal/70">Template</dt>
            <dd className="text-charcoal">{m.templateLabel}</dd>
          </>
        )}
        {links.map((l) => (
          <div key={l.href} className="contents">
            <dt className="text-charcoal/70">{l.kind}</dt>
            <dd>
              <Link href={l.href} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
                {l.label}
              </Link>
            </dd>
          </div>
        ))}
        <dt className="text-charcoal/70">Attachments</dt>
        <dd className="text-charcoal">{m.attachments.length ? m.attachments.map((a) => `${a.name} (${fileSize(a.size)})`).join(", ") : "None"}</dd>
      </dl>
      <article className="rounded-xl border border-charcoal/15 bg-canvas p-4" aria-label="Message">
        <p className="text-base font-semibold text-charcoal">{m.subject}</p>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{m.body}</div>
      </article>
    </div>
  );
}

/** Email history with search and filters. Opening a message shows its
 * content and sending details. */
export function HistoryList({ messages, filters, initialOpen }: { messages: MessageRow[]; filters: Filters; initialOpen: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const open = messages.find((m) => m.id === openId) ?? null;

  const apply = (next: Partial<Filters>) => {
    const f = { ...filters, q, ...next };
    const qs = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && qs.set(k, v));
    startTransition(() => router.push(`/email/history${qs.toString() ? `?${qs}` : ""}`, { scroll: false }));
  };
  const close = useCallback(() => {
    setOpenId(null);
    setUrlParam("open", null);
  }, []);

  return (
    <section aria-label="Email history" className="flex flex-col rounded-2xl border border-charcoal/10 bg-white">
      <form
        className="flex flex-wrap items-end gap-3 border-b border-charcoal/10 px-4 py-3 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          apply({});
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="history-q" className="mb-1.5 block text-sm font-medium text-charcoal">
            Search
          </label>
          <input id="history-q" type="search" className="input" placeholder="Recipient, email address or subject" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label htmlFor="history-status" className="mb-1.5 block text-sm font-medium text-charcoal">
            Status
          </label>
          <select id="history-status" className="input" value={filters.status} onChange={(e) => apply({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="sent">Sent</option>
            <option value="failed">Not sent</option>
            <option value="draft">Draft</option>
            <option value="sending">Sending</option>
          </select>
        </div>
        <div>
          <label htmlFor="history-kind" className="mb-1.5 block text-sm font-medium text-charcoal">
            To
          </label>
          <select id="history-kind" className="input" value={filters.kind} onChange={(e) => apply({ kind: e.target.value })}>
            <option value="">Anyone</option>
            <option value="family">Families</option>
            <option value="enquiry">Enquiries</option>
            <option value="staff">Staff</option>
            <option value="statement">Statements</option>
          </select>
        </div>
        <div>
          <label htmlFor="history-days" className="mb-1.5 block text-sm font-medium text-charcoal">
            When
          </label>
          <select id="history-days" className="input" value={filters.days} onChange={(e) => apply({ days: e.target.value })}>
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {messages.length === 0 ? (
        <EmptyState title="No emails match" description={Object.values(filters).some(Boolean) ? "Try another search or filter." : "Emails you draft or send will appear here."} />
      ) : (
        <div className={pending ? "opacity-60" : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                  <th scope="col" className="px-5 py-2.5">Recipient</th>
                  <th scope="col" className="px-3 py-2.5">Subject</th>
                  <th scope="col" className="px-3 py-2.5">Date</th>
                  <th scope="col" className="px-3 py-2.5 pr-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {messages.map((m) => (
                  <tr key={m.id} className={m.id === openId ? "bg-lilac-50" : "hover:bg-lilac-50"}>
                    <td className="px-5 py-2.5">
                      <span className="block text-charcoal">{m.recipientName ?? m.recipientEmail}</span>
                      <span className="block break-all text-xs text-charcoal/70">{m.recipientEmail}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="text-left font-medium text-lilac-700 underline-offset-4 hover:underline"
                        onClick={() => {
                          setOpenId(m.id);
                          setUrlParam("open", m.id);
                        }}
                      >
                        {m.subject || "(no subject)"}
                      </button>
                      {(m.childName || m.familyName || m.staffName || m.templateLabel) && (
                        <span className="block text-xs text-charcoal/70">
                          {[m.childName ?? m.familyName ?? m.staffName, m.templateLabel].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-charcoal">{fmtDateTime(m.sentAt ?? m.createdAt)}</td>
                    <td className="px-3 py-2.5 pr-5">
                      <StatusPill tone={MESSAGE_STATUS[m.status].tone}>{MESSAGE_STATUS[m.status].label}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-charcoal/10 px-5 py-3 text-sm text-charcoal/70">
            {messages.length === 300 ? "Showing the newest 300 — narrow the search to see older emails." : `${messages.length} email${messages.length === 1 ? "" : "s"}`}
          </p>
        </div>
      )}

      <Drawer
        open={open !== null}
        onRequestClose={close}
        title={open ? open.subject || "(no subject)" : "Email"}
        description={open ? `To ${open.recipientName ?? open.recipientEmail}` : undefined}
        footer={
          open && (open.status === "draft" || open.status === "failed") ? (
            <div className="flex justify-end">
              <Link href={`/email/compose?draftId=${open.id}`} className="btn-primary">
                {open.status === "failed" ? "Fix and resend" : "Continue editing"}
              </Link>
            </div>
          ) : undefined
        }
      >
        {open && <MessageDetail m={open} />}
      </Drawer>
    </section>
  );
}
