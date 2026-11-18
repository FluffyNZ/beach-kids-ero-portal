import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/data/invoices";
import { InvoiceDocument, PaymentDetails } from "@/components/finances/finance-documents";
import { PrintPageButton } from "@/components/finances/print-page-button";
import { ADMIN_PHONE, BANK_ACCOUNT_NAME, BANK_ACCOUNT_NUMBER } from "@/lib/email/invoice-email";

export const dynamic = "force-dynamic";

function reference(names: string[]) {
  return Array.from(new Set(names.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean))).join(" or ");
}

/** A printable copy of one invoice. */
export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const invoice = await getInvoiceById(params.id);
  if (!invoice) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 print:max-w-none">
      <style>{`@media print { @page { size: A4 portrait; margin: 14mm; } }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/finances/invoices?invoice=${invoice.id}`} className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
          ← Back to invoices
        </Link>
        <PrintPageButton label="Print invoice" />
      </div>
      <div className="rounded-2xl border border-charcoal/10 bg-white print:rounded-none print:border-0">
        <InvoiceDocument
          invoice={invoice}
          payment={
            invoice.status === "void" ? null : (
              <PaymentDetails
                accountName={BANK_ACCOUNT_NAME}
                accountNumber={BANK_ACCOUNT_NUMBER}
                phone={ADMIN_PHONE}
                reference={reference(invoice.line_items.map((l) => l.child_name))}
              />
            )
          }
        />
      </div>
    </div>
  );
}
