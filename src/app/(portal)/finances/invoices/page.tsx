import Link from "next/link";
import { FinancePage, FigureStrip } from "@/components/finances/finance-page";
import { InvoiceList, type InvoiceFilter } from "@/components/finances/invoice-list";
import { ExportInvoicesButton } from "@/components/finances/export-invoices-button";
import { getInvoicesList } from "@/lib/data/invoices";
import { accountBalances } from "@/lib/finance-ledger";
import { fmtDate, plural } from "@/lib/finance-format";
import { formatCurrency, nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: InvoiceFilter[] = ["all", "draft", "unpaid", "overdue", "paid", "void"];

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string; invoice?: string } }) {
  const today = nzTodayDateString();
  const invoices = await getInvoicesList();
  const balances = accountBalances(invoices, today);
  const drafts = invoices.filter((i) => i.status === "draft");
  const initialFilter = FILTERS.includes(searchParams.status as InvoiceFilter) ? (searchParams.status as InvoiceFilter) : "all";

  return (
    <FinancePage
      title="Invoices"
      description="Every invoice drafted from Fees, with balances and payments."
      actions={
        <>
          <ExportInvoicesButton invoices={invoices} today={today} />
          <Link href="/finances/fees" className="btn-primary">
            Draft from Fees
          </Link>
        </>
      }
    >
      <FigureStrip
        figures={[
          {
            label: "Outstanding",
            value: formatCurrency(balances.outstanding),
            scope: `Unpaid sent invoices as of ${fmtDate(today)}`,
            detail: plural(balances.unpaidCount, "invoice"),
          },
          {
            label: "Overdue",
            value: formatCurrency(balances.overdue),
            scope: "Part of outstanding, past the due date",
            detail: plural(balances.overdueCount, "invoice"),
            emphasis: balances.overdue > 0 ? "action" : undefined,
          },
          {
            label: "Drafts not sent",
            value: drafts.length,
            scope: "Not owed until sent",
            detail: drafts.length ? formatCurrency(drafts.reduce((s, i) => s + i.total_due, 0)) : undefined,
          },
        ]}
      />

      <InvoiceList invoices={invoices} today={today} initialFilter={initialFilter} initialInvoiceId={searchParams.invoice ?? null} />

      <p className="text-xs text-charcoal/70">
        Each invoice keeps the amounts it was drafted with. Payments settle the whole invoice; part payments aren&apos;t recorded.
      </p>
    </FinancePage>
  );
}
