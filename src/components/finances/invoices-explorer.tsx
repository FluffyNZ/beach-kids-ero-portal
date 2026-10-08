"use client";

import { useMemo, useState } from "react";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatShortDate, addDays, isOverdue, cn } from "@/lib/utils";
import { SearchIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { InvoiceDetailPanel } from "@/components/finances/invoice-detail-panel";

export type TabValue = "all" | "draft" | "unpaid" | "overdue" | "paid" | "void";

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: "all", label: "All invoices" },
  { value: "draft", label: "Drafts" },
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Voided" },
];

type Period = "all" | "month" | "3months";
const PERIOD_LABEL: Record<Period, string> = { all: "All time", month: "This month", "3months": "Last 3 months" };

const ROWS_PER_PAGE = 10;

function matchesTab(invoice: Invoice, tab: TabValue): boolean {
  switch (tab) {
    case "all":
      return true;
    case "draft":
      return invoice.status === "draft";
    case "unpaid":
      return invoice.status === "sent" && !isOverdue(invoice.due_date);
    case "overdue":
      return invoice.status === "sent" && isOverdue(invoice.due_date);
    case "paid":
      return invoice.status === "paid";
    case "void":
      return invoice.status === "void";
    default:
      return false;
  }
}

function matchesPeriod(invoice: Invoice, period: Period): boolean {
  if (period === "all") return true;
  const cutoffMonths = period === "month" ? 1 : 3;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - cutoffMonths);
  return new Date(invoice.issued_date) >= cutoff;
}

function matchesSearch(invoice: Invoice, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    invoice.bill_payer_name.toLowerCase().includes(q) ||
    invoice.invoice_number.toLowerCase().includes(q) ||
    invoice.line_items.some((li) => li.child_name.toLowerCase().includes(q))
  );
}

const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Unpaid: "bg-amber-50 text-amber-700",
  Overdue: "bg-red-50 text-red-700",
  Paid: "bg-charcoal text-white",
  Voided: "bg-slate-50 text-slate-400",
};

function statusInfo(invoice: Invoice): { label: string; className: string } {
  if (invoice.status === "draft") return { label: "Draft", className: STATUS_BADGE.Draft };
  if (invoice.status === "void") return { label: "Voided", className: STATUS_BADGE.Voided };
  if (invoice.status === "paid") return { label: "Paid", className: STATUS_BADGE.Paid };
  if (isOverdue(invoice.due_date)) return { label: "Overdue", className: STATUS_BADGE.Overdue };
  return { label: "Unpaid", className: STATUS_BADGE.Unpaid };
}

function childSummary(invoice: Invoice): string {
  if (invoice.line_items.length === 0) return "—";
  if (invoice.line_items.length === 1) return invoice.line_items[0].child_name;
  return `${invoice.line_items[0].child_name} +${invoice.line_items.length - 1} more`;
}

/** The interactive heart of the Invoices page: tabs, search, a time-period
 * filter, a CSV export of whatever's currently in view, the table itself,
 * and the row-selected details panel. Everything here is a UI-only layer
 * over the exact same `invoices` the server already fetched — no new
 * calculations, no new data source. */
export function InvoicesExplorer({ invoices, initialStatus }: { invoices: Invoice[]; initialStatus: TabValue }) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialStatus);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const tabCounts = useMemo(() => {
    const counts: Record<TabValue, number> = { all: 0, draft: 0, unpaid: 0, overdue: 0, paid: 0, void: 0 };
    TABS.forEach((t) => {
      counts[t.value] = invoices.filter((i) => matchesTab(i, t.value)).length;
    });
    return counts;
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter((i) => matchesTab(i, activeTab) && matchesPeriod(i, period) && matchesSearch(i, query));
  }, [invoices, activeTab, period, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE);

  const selected = selectedId ? invoices.find((i) => i.id === selectedId) ?? null : null;

  function selectTab(tab: TabValue) {
    setActiveTab(tab);
    setPage(0);
  }

  return (
    <div className="relative flex items-start gap-6">
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white">
        {/* Status tabs — a simple black underline on the selected tab,
            rather than the app's usual filled pill, per the Mercury
            reference. */}
        <div className="flex flex-wrap gap-5 overflow-x-auto border-b border-slate-200 px-5 pt-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => selectTab(tab.value)}
              aria-current={activeTab === tab.value ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2",
                activeTab === tab.value
                  ? "border-charcoal text-charcoal"
                  : "border-transparent text-charcoal/50 hover:text-charcoal"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === tab.value ? "bg-charcoal text-white" : "bg-slate-100 text-charcoal/50"
                )}
              >
                {tabCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + period filter + export toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <div className="relative min-w-[14rem] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search family, child or invoice number…"
              aria-label="Search invoices"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={periodOpen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-charcoal hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
            >
              {PERIOD_LABEL[period]}
              <ChevronDownIcon className="h-3.5 w-3.5 text-charcoal/50" />
            </button>
            {periodOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPeriodOpen(false)} aria-hidden="true" />
                <div
                  role="listbox"
                  className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-cardHover"
                >
                  {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="option"
                      aria-selected={period === p}
                      onClick={() => {
                        setPeriod(p);
                        setPeriodOpen(false);
                        setPage(0);
                      }}
                      className={cn(
                        "flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                        period === p ? "font-medium text-charcoal" : "text-charcoal/70"
                      )}
                    >
                      {PERIOD_LABEL[p]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-charcoal/50">
            {invoices.length === 0 ? (
              <>
                No invoices yet. Draft one from{" "}
                <a href="/children/fees-by-family" className="font-medium text-charcoal underline">
                  Fees by family
                </a>
                .
              </>
            ) : (
              "No invoices match your search and filters."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-charcoal/40">
                  <th className="px-5 py-2.5 font-medium">Invoice</th>
                  <th className="px-2 py-2.5 font-medium">Family / Child</th>
                  <th className="hidden px-2 py-2.5 font-medium md:table-cell">Billing period</th>
                  <th className="hidden px-2 py-2.5 font-medium sm:table-cell">Due date</th>
                  <th className="px-2 py-2.5 text-right font-medium">Total</th>
                  <th className="hidden px-2 py-2.5 text-right font-medium lg:table-cell">Balance</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((invoice) => {
                  const status = statusInfo(invoice);
                  const isSelected = invoice.id === selectedId;
                  const balance = invoice.status === "paid" ? 0 : invoice.status === "sent" ? invoice.total_due : null;
                  return (
                    <tr
                      key={invoice.id}
                      tabIndex={0}
                      role="button"
                      aria-selected={isSelected}
                      onClick={() => setSelectedId(invoice.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(invoice.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 transition-colors last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal",
                        isSelected ? "bg-slate-50" : "hover:bg-slate-50/70"
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-charcoal">{invoice.invoice_number}</td>
                      <td className="px-2 py-3">
                        <p className="text-charcoal">{invoice.bill_payer_name}</p>
                        <p className="text-xs text-charcoal/50">{childSummary(invoice)}</p>
                      </td>
                      <td className="hidden px-2 py-3 text-charcoal/70 md:table-cell">
                        {formatShortDate(invoice.week_start_date)} – {formatShortDate(addDays(invoice.week_start_date, 4))}
                      </td>
                      <td className="hidden px-2 py-3 text-charcoal/70 sm:table-cell">{formatShortDate(invoice.due_date)}</td>
                      <td className="px-2 py-3 text-right font-medium text-charcoal">{formatCurrency(invoice.total_due)}</td>
                      <td className="hidden px-2 py-3 text-right text-charcoal/70 lg:table-cell">
                        {balance === null ? "—" : formatCurrency(balance)}
                      </td>
                      <td className="px-2 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ChevronRightIcon className="ml-auto h-4 w-4 text-charcoal/30" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-sm text-charcoal/60">
            <p>
              Showing {safePage * ROWS_PER_PAGE + 1}–{Math.min(filtered.length, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE)} of{" "}
              {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-2 text-xs text-charcoal/50">
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details panel — fixed full-screen overlay on small screens, an
          inline sticky column beside the (still fully usable/scrollable)
          table from md upward. */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-charcoal/20 md:hidden" onClick={() => setSelectedId(null)} aria-hidden="true" />
          <div
            className={cn(
              "fixed inset-0 z-50 md:sticky md:top-20 md:inset-auto md:z-auto md:max-h-[calc(100vh-6rem)] md:w-[26rem] md:shrink-0",
              "border-slate-200 bg-white md:rounded-xl md:border md:shadow-cardHover"
            )}
          >
            <InvoiceDetailPanel invoice={selected} onClose={() => setSelectedId(null)} />
          </div>
        </>
      )}
    </div>
  );
}
