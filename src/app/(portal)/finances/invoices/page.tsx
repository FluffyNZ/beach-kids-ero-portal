import Link from "next/link";
import { getInvoicesList } from "@/lib/data/invoices";
import { InvoiceCard } from "@/components/finances/invoice-card";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: Array<{ value: InvoiceStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Outstanding" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Voided" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  const activeTab = TABS.find((t) => t.value === searchParams.status)?.value ?? "all";
  const invoices = await getInvoicesList(activeTab === "all" ? undefined : { status: activeTab });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Invoices</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Invoices drafted from Fees by family — each one is a frozen snapshot, so editing a week&apos;s hours
            later never changes what was already sent.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/finances/statements" className="btn-secondary">
            Statements
          </Link>
          <Link href="/finances" className="btn-ghost">
            ← Finances
          </Link>
        </div>
      </div>

      <div className="card flex flex-wrap gap-1 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/finances/invoices" : `/finances/invoices?status=${tab.value}`}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.value ? "bg-burgundy-500 text-white" : "text-charcoal/60 hover:bg-sand-100"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="card p-6 text-center text-sm text-charcoal/50">
          No invoices here yet. Draft one from{" "}
          <Link href="/children/fees-by-family" className="font-medium underline">
            Fees by family
          </Link>
          .
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  );
}
