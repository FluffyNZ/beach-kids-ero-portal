"use client";

import type { Invoice } from "@/lib/types";
import { formatShortDate, addDays, isOverdue } from "@/lib/utils";
import { DownloadIcon } from "@/components/icons";

function statusLabel(invoice: Invoice): string {
  if (invoice.status === "draft") return "Draft";
  if (invoice.status === "void") return "Voided";
  if (invoice.status === "paid") return "Paid";
  return isOverdue(invoice.due_date) ? "Overdue" : "Unpaid";
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A real CSV export of every invoice on file (not just whatever the table
 * below happens to be filtered to) — invoice number, family, children,
 * billing period, due date, total, status. Built client-side with nothing
 * but the Blob/anchor-download APIs already available in the browser, so
 * it needed no new dependency and no backend route. */
export function ExportInvoicesButton({ invoices }: { invoices: Invoice[] }) {
  function handleExport() {
    const header = ["Invoice", "Family", "Child(ren)", "Billing period", "Due date", "Total (NZD)", "Status"];
    const lines = invoices.map((i) => [
      i.invoice_number,
      i.bill_payer_name,
      i.line_items.map((li) => li.child_name).join("; "),
      `${formatShortDate(i.week_start_date)} - ${formatShortDate(addDays(i.week_start_date, 4))}`,
      formatShortDate(i.due_date),
      i.total_due.toFixed(2),
      statusLabel(i),
    ]);
    const csv = [header, ...lines].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beach-kids-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={invoices.length === 0}
      title="Download every invoice on file as a CSV"
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <DownloadIcon className="h-4 w-4" />
      Export
    </button>
  );
}
