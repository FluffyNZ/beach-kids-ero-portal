"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, SearchField } from "@/components/finances/finance-page";
import { InvoiceActions, InvoiceDetailBody } from "@/components/finances/invoice-detail";
import { formatCurrency, cn } from "@/lib/utils";
import { INVOICE_STATE_LABEL, INVOICE_STATE_TONE, fmtDate, invoiceBalance, invoiceState, type InvoiceStateKey } from "@/lib/finance-format";
import type { Invoice } from "@/lib/types";

export type InvoiceFilter = "all" | InvoiceStateKey;
type Issued = "all" | "month" | "3months";
const PAGE_SIZE = 25;

function setUrlParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url.toString());
}

/** Searchable, filterable invoice table. Opening a row shows the invoice's
 * breakdown, payment history and actions in a side panel. */
export function InvoiceList({
  invoices,
  today,
  initialFilter,
  initialInvoiceId,
}: {
  invoices: Invoice[];
  today: string;
  initialFilter: InvoiceFilter;
  initialInvoiceId: string | null;
}) {
  const [filter, setFilter] = useState<InvoiceFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [issued, setIssued] = useState<Issued>("all");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(initialInvoiceId && invoices.some((i) => i.id === initialInvoiceId) ? initialInvoiceId : null);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const stateById = useMemo(() => new Map(invoices.map((i) => [i.id, invoiceState(i, today)])), [invoices, today]);

  const counts = useMemo(() => {
    const c: Record<InvoiceFilter, number> = { all: invoices.length, draft: 0, unpaid: 0, overdue: 0, paid: 0, void: 0 };
    invoices.forEach((i) => (c[stateById.get(i.id)!] += 1));
    return c;
  }, [invoices, stateById]);

  const issuedFrom = useMemo(() => {
    if (issued === "all") return null;
    const [y, m] = today.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 - (issued === "month" ? 0 : 2), 1));
    return d.toISOString().slice(0, 10);
  }, [issued, today]);

  const q = query.trim().toLowerCase();
  const filtered = invoices.filter((i) => {
    if (filter !== "all" && stateById.get(i.id) !== filter) return false;
    if (issuedFrom && i.issued_date < issuedFrom) return false;
    if (!q) return true;
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      i.bill_payer_name.toLowerCase().includes(q) ||
      i.line_items.some((li) => li.child_name.toLowerCase().includes(q))
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const open = openId ? invoices.find((i) => i.id === openId) ?? null : null;

  useEffect(() => setPage(0), [filter, q, issued]);

  const openInvoice = (id: string) => {
    setResult(null);
    setOpenId(id);
    setUrlParam("invoice", id);
  };
  const close = useCallback(() => {
    setOpenId(null);
    setResult(null);
    setUrlParam("invoice", null);
  }, []);

  const options: Array<{ value: InvoiceFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: counts.all },
    { value: "draft", label: "Draft", count: counts.draft },
    { value: "unpaid", label: "Unpaid", count: counts.unpaid },
    { value: "overdue", label: "Overdue", count: counts.overdue },
    { value: "paid", label: "Paid", count: counts.paid },
    { value: "void", label: "Void", count: counts.void },
  ];

  return (
    <section aria-label="Invoices" className="flex flex-col rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-charcoal/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField id="invoice-search" label="Search invoices" value={query} onChange={setQuery} placeholder="Invoice number, family or child" />
          <div className="flex items-center gap-2">
            <label htmlFor="invoice-issued" className="text-sm text-charcoal/70">
              Issued
            </label>
            <select id="invoice-issued" className="input w-auto py-1.5" value={issued} onChange={(e) => setIssued(e.target.value as Issued)}>
              <option value="all">Any time</option>
              <option value="month">This month</option>
              <option value="3months">Last 3 months</option>
            </select>
          </div>
        </div>
        <FilterChips
          label="Invoice status"
          options={options}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setUrlParam("status", v === "all" ? null : v);
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={invoices.length === 0 ? "No invoices yet" : "No invoices match"}
          description={invoices.length === 0 ? "Draft an invoice from Fees once a week's fees are ready." : "Try another search, status or date."}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                  <th scope="col" className="px-5 py-2.5">Invoice</th>
                  <th scope="col" className="px-3 py-2.5">Family account</th>
                  <th scope="col" className="px-3 py-2.5">Issue date</th>
                  <th scope="col" className="px-3 py-2.5">Due date</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Balance</th>
                  <th scope="col" className="px-3 py-2.5 pr-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const state = stateById.get(inv.id)!;
                  const balance = invoiceBalance(inv);
                  return (
                    <tr key={inv.id} className={cn("border-b border-charcoal/10 last:border-0 hover:bg-lilac-50", inv.id === openId && "bg-lilac-50")}>
                      <th scope="row" className="whitespace-nowrap px-5 py-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => openInvoice(inv.id)}
                          className="font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
                        >
                          {inv.invoice_number}
                        </button>
                      </th>
                      <td className="px-3 py-2.5 text-charcoal">
                        {inv.bill_payer_name}
                        <span className="block truncate text-xs text-charcoal/70">{inv.line_items.map((l) => l.child_name).join(", ") || "No children"}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-charcoal">{fmtDate(inv.issued_date)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-charcoal">{fmtDate(inv.due_date)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(inv.total_due)}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{balance === null ? "—" : formatCurrency(balance)}</td>
                      <td className="px-3 py-2.5 pr-5">
                        <StatusPill tone={INVOICE_STATE_TONE[state]}>{INVOICE_STATE_LABEL[state]}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 px-5 py-3 text-sm text-charcoal/70">
            <p>
              Showing {safePage * PAGE_SIZE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length}
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary px-3 py-1" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  Previous
                </button>
                <span>
                  Page {safePage + 1} of {pages}
                </span>
                <button type="button" className="btn-secondary px-3 py-1" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <Drawer
        open={open !== null}
        onRequestClose={close}
        title={open ? `Invoice ${open.invoice_number}` : "Invoice"}
        description={open ? `${open.bill_payer_name} · ${formatCurrency(open.total_due)}` : undefined}
        footer={open ? <InvoiceActions invoice={open} today={today} onResult={setResult} /> : undefined}
      >
        {open && <InvoiceDetailBody invoice={open} today={today} result={result} />}
      </Drawer>
    </section>
  );
}
