import Link from "next/link";
import { getInvoicesList } from "@/lib/data/invoices";
import { InvoicesExplorer, type TabValue } from "@/components/finances/invoices-explorer";
import { ExportInvoicesButton } from "@/components/finances/export-invoices-button";
import { formatCurrency, isOverdue, mondayOf, addDays } from "@/lib/utils";
import { PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

// A tab can be bookmarked/linked to (e.g. ?status=unpaid) for the initial
// view — live tab switching after that happens client-side in
// InvoicesExplorer so the table and the selected invoice's details panel
// never lose state on a filter change.
const INITIAL_TAB_VALUES: TabValue[] = ["all", "draft", "unpaid", "overdue", "paid", "void"];

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  // One fetch, every status — the explorer below derives each tab's rows
  // and counts from this same list, rather than re-querying per tab the
  // way the previous version did.
  const invoices = await getInvoicesList();

  const initialStatus: TabValue = INITIAL_TAB_VALUES.includes(searchParams.status as TabValue)
    ? (searchParams.status as TabValue)
    : "all";

  const outstanding = invoices.filter((i) => i.status === "sent");
  const totalOutstanding = outstanding.reduce((sum, i) => sum + i.total_due, 0);
  const totalOverdue = outstanding.filter((i) => isOverdue(i.due_date)).reduce((sum, i) => sum + i.total_due, 0);

  const weekStart = mondayOf(new Date());
  const weekAfter = addDays(weekStart, 7);
  const receivedThisWeek = invoices
    .filter((i) => i.status === "paid" && i.paid_at && i.paid_at.slice(0, 10) >= weekStart && i.paid_at.slice(0, 10) < weekAfter)
    .reduce((sum, i) => sum + i.total_due, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Invoices</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Invoices drafted from Fees by family — each one is a frozen snapshot, so editing a week&apos;s hours
            later never changes what was already sent.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/finances/statements"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-slate-50"
          >
            Statements
          </Link>
          <ExportInvoicesButton invoices={invoices} />
          <Link
            href="/children/fees-by-family"
            title="Draft a new invoice from Fees by family — invoices are always created from one week's real fee numbers, never typed in freehand."
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-charcoal px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-charcoal/90"
          >
            <PlusIcon />
            Create invoice
          </Link>
        </div>
      </div>

      {/* Compact financial summary — fine vertical dividers rather than
          separate stat cards. */}
      <div className="flex flex-wrap divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <div className="min-w-[10rem] flex-1 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Outstanding</p>
          <p className="mt-1 font-display text-2xl font-bold text-charcoal">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="min-w-[10rem] flex-1 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Overdue</p>
          <p className={`mt-1 font-display text-2xl font-bold ${totalOverdue > 0 ? "text-red-700" : "text-charcoal"}`}>
            {formatCurrency(totalOverdue)}
          </p>
        </div>
        <div className="min-w-[10rem] flex-1 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Received this week</p>
          <p className="mt-1 font-display text-2xl font-bold text-charcoal">{formatCurrency(receivedThisWeek)}</p>
        </div>
      </div>

      <InvoicesExplorer invoices={invoices} initialStatus={initialStatus} />
    </div>
  );
}
