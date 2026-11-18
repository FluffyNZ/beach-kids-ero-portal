"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, SearchField } from "@/components/finances/finance-page";
import { updateFamilyEnquiryStatus } from "@/lib/actions/email";
import { MESSAGE_STATUS } from "@/lib/email-format";
import { fmtDate, fmtDateTime } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { EnquiryWithActivity } from "@/lib/data/email-hub";

type Filter = "enquiry" | "converted" | "dismissed" | "all";
const STATUS_LABEL = { enquiry: "Open", converted: "Converted", dismissed: "Dismissed" } as const;

function Actions({ e }: { e: EnquiryWithActivity }) {
  const router = useRouter();
  const busy = useRef(false);
  const [state, setState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });
  async function set(status: "enquiry" | "converted" | "dismissed") {
    if (busy.current) return;
    busy.current = true;
    setState({ saving: true, error: null });
    const res = await updateFamilyEnquiryStatus(e.id, status);
    busy.current = false;
    setState({ saving: false, error: res.success ? null : res.error });
    if (res.success) router.refresh();
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {e.status === "enquiry" ? (
          <>
            <Link href={`/email/compose?familyEnquiryId=${e.id}`} className="btn-primary px-3 py-1.5">
              {e.messages.some((m) => m.status === "sent") ? "Email again" : "Reply"}
            </Link>
            <button type="button" className="btn-secondary px-3 py-1.5" disabled={state.saving} onClick={() => set("converted")}>
              Mark converted
            </button>
            <button type="button" className="btn-ghost px-3 py-1.5" disabled={state.saving} onClick={() => set("dismissed")}>
              Dismiss
            </button>
          </>
        ) : (
          <button type="button" className="btn-secondary px-3 py-1.5" disabled={state.saving} onClick={() => set("enquiry")}>
            Reopen enquiry
          </button>
        )}
      </div>
      {e.status === "enquiry" && <p className="text-xs text-charcoal/70">Marking converted doesn&apos;t create a child record — add the child from Children once they enrol.</p>}
      {state.error && (
        <p role="alert" className="text-sm text-charcoal">
          <span className="font-medium text-status-action">Not updated.</span> {state.error}
        </p>
      )}
    </div>
  );
}

/** Enquiries from prospective families, with their emails and follow-up actions. */
export function EnquiryList({ enquiries, initialOpen }: { enquiries: EnquiryWithActivity[]; initialOpen: string | null }) {
  const [filter, setFilter] = useState<Filter>(() => {
    const e = enquiries.find((x) => x.id === initialOpen);
    return e && e.status !== "enquiry" ? "all" : "enquiry";
  });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(initialOpen);
  const q = query.trim().toLowerCase();
  const rows = enquiries.filter(
    (e) =>
      (filter === "all" || e.status === filter) &&
      (!q || [e.parent_full_name, e.child_full_name, e.parent_email, e.parent_phone ?? ""].some((v) => v.toLowerCase().includes(q)))
  );
  const count = (f: Filter) => enquiries.filter((e) => f === "all" || e.status === f).length;

  return (
    <section aria-label="Enquiries" className="flex flex-col rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-charcoal/10 px-4 py-3 sm:px-5">
        <SearchField id="enquiry-search" label="Search enquiries" value={query} onChange={setQuery} placeholder="Parent, child, email or phone" />
        <FilterChips
          label="Enquiry status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "enquiry", label: "Open", count: count("enquiry") },
            { value: "converted", label: "Converted", count: count("converted") },
            { value: "dismissed", label: "Dismissed", count: count("dismissed") },
            { value: "all", label: "All", count: count("all") },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={enquiries.length === 0 ? "No enquiries yet" : "No enquiries match"}
          description={enquiries.length === 0 ? "Add a new enquiry when a family gets in touch." : "Try another search or status."}
        />
      ) : (
        <ul className="divide-y divide-charcoal/10">
          {rows.map((e) => {
            const expanded = open === e.id;
            return (
              <Fragment key={e.id}>
                <li className={cn(expanded && "bg-lilac-50/60")}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : e.id)}
                    className="flex w-full flex-wrap items-start justify-between gap-3 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-charcoal">
                        {e.parent_full_name} <span className="font-normal text-charcoal/70">· for {e.child_full_name}</span>
                      </span>
                      <span className="block break-all text-xs text-charcoal/70">
                        {e.parent_email}
                        {e.parent_phone ? ` · ${e.parent_phone}` : ""} · added {fmtDate(e.created_at.slice(0, 10))}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {e.awaitingReply && <StatusPill tone="attention">No reply sent yet</StatusPill>}
                      {!e.awaitingReply && e.lastContact && <span className="text-xs text-charcoal/70">Last emailed {fmtDate(e.lastContact.slice(0, 10))}</span>}
                      <StatusPill tone={e.status === "enquiry" ? "neutral" : e.status === "converted" ? "ready" : "neutral"}>{STATUS_LABEL[e.status]}</StatusPill>
                    </span>
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-4 px-5 pb-4">
                      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[9rem_1fr]">
                        <dt className="text-charcoal/70">Room wanted</dt>
                        <dd className="text-charcoal">{e.intended_room_name ?? "Not recorded"}</dd>
                        <dt className="text-charcoal/70">Hoped start</dt>
                        <dd className="text-charcoal">{e.intended_start_date ? fmtDate(e.intended_start_date) : "Not recorded"}</dd>
                        {e.notes && (
                          <>
                            <dt className="text-charcoal/70">Notes</dt>
                            <dd className="whitespace-pre-line text-charcoal">{e.notes}</dd>
                          </>
                        )}
                      </dl>
                      <div>
                        <h3 className="mb-1.5 text-sm font-semibold text-charcoal">Emails</h3>
                        {e.messages.length === 0 ? (
                          <p className="text-sm text-charcoal/70">No emails yet.</p>
                        ) : (
                          <ul className="divide-y divide-charcoal/10 rounded-xl border border-charcoal/10 bg-white">
                            {e.messages.map((m) => (
                              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                <Link href={m.status === "draft" || m.status === "failed" ? `/email/compose?draftId=${m.id}` : `/email/history?open=${m.id}`} className="min-w-0 text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
                                  {m.subject}
                                </Link>
                                <span className="flex items-center gap-2 text-xs text-charcoal/70">
                                  {fmtDateTime(m.sentAt ?? m.createdAt)}
                                  <StatusPill tone={MESSAGE_STATUS[m.status].tone}>{MESSAGE_STATUS[m.status].label}</StatusPill>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Actions e={e} />
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </section>
  );
}
