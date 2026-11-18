"use client";

import type { Invoice } from "@/lib/types";
import { DownloadIcon } from "@/components/icons";
import { INVOICE_STATE_LABEL, fmtWeek, invoiceBalance, invoiceState } from "@/lib/finance-format";

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Downloads every invoice on file as a CSV (dates as YYYY-MM-DD, amounts
 * in NZD). */
export function ExportInvoicesButton({ invoices, today }: { invoices: Invoice[]; today: string }) {
  function handleExport() {
    const header = ["Invoice", "Family account", "Children", "Billing week", "Issue date", "Due date", "Amount (NZD)", "Balance (NZD)", "Status"];
    const lines = invoices.map((i) => {
      const balance = invoiceBalance(i);
      return [
        i.invoice_number,
        i.bill_payer_name,
        i.line_items.map((li) => li.child_name).join("; "),
        fmtWeek(i.week_start_date),
        i.issued_date,
        i.due_date ?? "",
        i.total_due.toFixed(2),
        balance === null ? "" : balance.toFixed(2),
        INVOICE_STATE_LABEL[invoiceState(i, today)],
      ];
    });
    const csv = [header, ...lines].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beach-kids-invoices-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleExport} disabled={invoices.length === 0} className="btn-secondary">
      <DownloadIcon className="h-4 w-4" />
      Export CSV
    </button>
  );
}
