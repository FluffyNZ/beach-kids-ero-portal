"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, SearchField } from "@/components/finances/finance-page";
import { createDraftInvoice } from "@/lib/actions/invoices";
import { formatCurrency, cn } from "@/lib/utils";
import { INVOICE_STATE_LABEL, fmtWeek } from "@/lib/finance-format";
import type { FeeReviewRow, FeeReviewStatus } from "@/lib/data/finance-hub";

const STATUS: Record<FeeReviewStatus, { label: string; tone: PillTone }> = {
  estimated: { label: "Estimated — hours not confirmed", tone: "attention" },
  ready: { label: "Ready to invoice", tone: "ready" },
  invoiced: { label: "Invoiced", tone: "neutral" },
  changed: { label: "Changed since invoiced", tone: "attention" },
  unlinked: { label: "No family account", tone: "action" },
};

type Filter = "all" | FeeReviewStatus;

function hrs(n: number) {
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} h`;
}

function DraftButton({ billPayerId, weekStart }: { billPayerId: string; weekStart: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    if (busy.current) return;
    busy.current = true;
    setState("saving");
    setError(null);
    try {
      const { id } = await createDraftInvoice(billPayerId, weekStart);
      router.push(`/finances/invoices?invoice=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't draft this invoice.");
      setState("error");
      busy.current = false;
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className="btn-primary px-3 py-1.5" disabled={state === "saving"} onClick={draft}>
        {state === "saving" ? "Drafting…" : "Draft invoice"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-charcoal">
          <span className="font-medium text-status-action">Not drafted.</span> {error}
        </p>
      )}
    </div>
  );
}

function Breakdown({ row, weekStart }: { row: FeeReviewRow; weekStart: string }) {
  return (
    <div className="flex flex-col gap-4 bg-canvas/60 px-4 py-4 sm:px-5">
      <div className="overflow-x-auto rounded-xl border border-charcoal/10 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
              <th scope="col" className="px-3 py-2">Child</th>
              <th scope="col" className="px-3 py-2 text-right">Hours</th>
              <th scope="col" className="px-3 py-2 text-right">20 Hours ECE</th>
              <th scope="col" className="px-3 py-2 text-right">Chargeable</th>
              <th scope="col" className="px-3 py-2 text-right">Rate</th>
              <th scope="col" className="px-3 py-2 text-right">Sibling discount</th>
              <th scope="col" className="px-3 py-2 text-right">Fee</th>
              <th scope="col" className="px-3 py-2 text-right">WINZ</th>
              <th scope="col" className="px-3 py-2 text-right">Family pays</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {row.children.map((c) => (
              <tr key={c.child_id}>
                <th scope="row" className="px-3 py-2 text-left font-medium text-charcoal">
                  <Link href={`/children/${c.child_id}?tab=bookings`} className="hover:underline">
                    {c.full_name}
                  </Link>
                  <span className="block text-xs font-normal text-charcoal/70">
                    {c.room_name ?? "No room"} · {c.is_estimated ? "booked hours (estimate)" : "confirmed hours"}
                  </span>
                </th>
                <td className="px-3 py-2 text-right tabular-nums">{hrs(c.weekly_hours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.ece_free_hours > 0 ? `−${hrs(c.ece_free_hours)}` : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{hrs(c.chargeable_hours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.hourly_rate)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {c.sibling_discount_amount > 0 ? `−${formatCurrency(c.sibling_discount_amount)}` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(c.fee_total)}
                  {c.is_special_override && <span className="block text-xs text-charcoal/70">Special weekly fee</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{c.winz_payment > 0 ? `−${formatCurrency(c.winz_payment)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(c.parent_pays)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-charcoal/20">
              <th scope="row" colSpan={6} className="px-3 py-2 text-left text-sm font-semibold">
                Total
              </th>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(row.feeTotal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.winz > 0 ? `−${formatCurrency(row.winz)}` : "—"}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(row.parentPays)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {row.status === "changed" && row.invoice && (
        <p className="text-sm text-charcoal">
          {row.invoice.number} was issued for {formatCurrency(row.invoice.total)}; the current fees come to {formatCurrency(row.parentPays)}.
          The invoice keeps its original amount — void and redraft it only if it should change.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {row.billPayerId && !row.invoice && <DraftButton billPayerId={row.billPayerId} weekStart={weekStart} />}
        {row.invoice && (
          <Link href={`/finances/invoices?invoice=${row.invoice.id}`} className="btn-secondary px-3 py-1.5">
            Open {row.invoice.number}
          </Link>
        )}
        {row.isEstimated && (
          <Link href={`/children/hours?week=${weekStart}`} className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
            Confirm hours for this week
          </Link>
        )}
        {row.billPayerId ? (
          <Link href={`/finances/clients/${row.billPayerId}`} className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
            Family account
          </Link>
        ) : (
          <p className="text-sm text-charcoal/70">Link each child to a family account from their profile before invoicing.</p>
        )}
        {row.billPayerId && !row.email && <p className="text-sm text-charcoal/70">No email on file — the invoice can be drafted but not emailed.</p>}
      </div>
    </div>
  );
}

/** One row per family account for the selected week, with the per-child
 * calculation in an expandable breakdown. Amounts come straight from the
 * existing fee calculation; nothing here changes them. */
export function FeeReviewTable({ rows, weekStart, initialFilter }: { rows: FeeReviewRow[]; weekStart: string; initialFilter?: Filter }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter ?? "all");
  const [open, setOpen] = useState<Set<string>>(() => new Set(initialFilter === "unlinked" ? ["unlinked"] : []));

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, estimated: 0, ready: 0, invoiced: 0, changed: 0, unlinked: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!q || r.familyName.toLowerCase().includes(q) || r.children.some((c) => c.full_name.toLowerCase().includes(q)))
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const filterOptions: Array<{ value: Filter; label: string; count: number }> = [
    { value: "all", label: "All", count: counts.all },
    { value: "estimated", label: "Estimated", count: counts.estimated },
    { value: "ready", label: "Ready to invoice", count: counts.ready },
    { value: "invoiced", label: "Invoiced", count: counts.invoiced },
    { value: "changed", label: "Changed since invoiced", count: counts.changed },
    { value: "unlinked", label: "No family account", count: counts.unlinked },
  ];

  return (
    <section aria-label="Fees by family account" className="flex flex-col rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-charcoal/10 px-4 py-3 sm:px-5">
        <SearchField id="fee-search" label="Search fees" value={query} onChange={setQuery} placeholder="Search family or child" />
        <FilterChips label="Review status" options={filterOptions.filter((o) => o.value === "all" || o.count > 0)} value={filter} onChange={setFilter} />
      </div>

      {visible.length === 0 ? (
        <EmptyState title={rows.length === 0 ? "No fees for this week" : "No families match"} description={rows.length === 0 ? "There are no enrolled children with fees this week." : "Try another search or status."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Show breakdown</span></th>
                <th scope="col" className="px-3 py-2.5">Family account</th>
                <th scope="col" className="px-3 py-2.5">Children</th>
                <th scope="col" className="hidden px-3 py-2.5 md:table-cell">Billing period</th>
                <th scope="col" className="px-3 py-2.5 text-right">Family pays</th>
                <th scope="col" className="px-3 py-2.5 pr-5">Review status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const expanded = open.has(row.key);
                const s = STATUS[row.status];
                const panelId = `fee-breakdown-${row.key}`;
                return (
                  <Fragment key={row.key}>
                    <tr className={cn("border-b border-charcoal/10 align-top", expanded && "bg-lilac-50/60")}>
                      <td className="px-2 py-2.5">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          onClick={() => toggle(row.key)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-charcoal hover:bg-lilac-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
                        >
                          <span aria-hidden="true" className={cn("inline-block transition-transform", expanded && "rotate-90")}>›</span>
                          <span className="sr-only">{expanded ? "Hide" : "Show"} breakdown for {row.familyName}</span>
                        </button>
                      </td>
                      <th scope="row" className="px-3 py-2.5 text-left font-medium text-charcoal">
                        {row.billPayerId ? (
                          <button type="button" onClick={() => toggle(row.key)} className="text-left hover:underline">
                            {row.familyName}
                          </button>
                        ) : (
                          <span className="italic">{row.familyName}</span>
                        )}
                      </th>
                      <td className="px-3 py-2.5 text-charcoal">{row.children.map((c) => c.full_name).join(", ")}</td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-charcoal/70 md:table-cell">{fmtWeek(weekStart)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <span className="font-semibold tabular-nums text-charcoal">{formatCurrency(row.parentPays)}</span>
                        {row.winz > 0 && <span className="block text-xs text-charcoal/70">after {formatCurrency(row.winz)} WINZ</span>}
                      </td>
                      <td className="px-3 py-2.5 pr-5">
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                        {row.invoice && (
                          <span className="mt-1 block text-xs text-charcoal/70">
                            {row.invoice.number} · {INVOICE_STATE_LABEL[row.invoice.state]}
                          </span>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={panelId} className="border-b border-charcoal/10">
                        <td colSpan={6} className="p-0">
                          <Breakdown row={row} weekStart={weekStart} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
