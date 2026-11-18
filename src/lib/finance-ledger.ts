import type { Invoice } from "@/lib/types";
import { fmtWeek, nzDateOf, sentAsTest } from "@/lib/finance-format";

// A family account's ledger, built only from its invoices:
// - a charge on each invoice's issue date, once it has been sent (status
//   sent or paid) — drafts and void invoices are never charges;
// - a payment on the NZ date the invoice was marked paid.
// Part payments and credits aren't recorded in Earlydesk, so each payment
// settles one whole invoice.

export type LedgerEntry = {
  date: string;
  kind: "charge" | "payment";
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  /** Running balance after this entry. */
  balance: number;
};

export function ledgerEntries(invoices: Invoice[]): LedgerEntry[] {
  const raw: Omit<LedgerEntry, "balance">[] = [];
  for (const inv of invoices) {
    if (inv.status !== "sent" && inv.status !== "paid") continue;
    raw.push({
      date: inv.issued_date,
      kind: "charge",
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      description: `Invoice ${inv.invoice_number} · week of ${fmtWeek(inv.week_start_date)}${sentAsTest(inv) ? " (sent as a test)" : ""}`,
      amount: inv.total_due,
    });
    if (inv.status === "paid") {
      raw.push({
        date: inv.paid_at ? nzDateOf(inv.paid_at) : inv.issued_date,
        kind: "payment",
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        description: `Payment for ${inv.invoice_number}${inv.xero_transaction_id ? " · Xero bank transaction" : ""}${inv.paid_at ? "" : " · date not recorded"}`,
        amount: inv.total_due,
      });
    }
  }
  raw.sort((a, b) =>
    a.date !== b.date
      ? a.date < b.date ? -1 : 1
      : a.kind !== b.kind
        ? a.kind === "charge" ? -1 : 1
        : a.invoiceNumber.localeCompare(b.invoiceNumber)
  );
  let balance = 0;
  return raw.map((e) => {
    balance += e.kind === "charge" ? e.amount : -e.amount;
    return { ...e, balance: round2(balance) };
  });
}

export type StatementSummary = {
  from: string;
  to: string;
  openingBalance: number;
  totalCharges: number;
  totalPayments: number;
  closingBalance: number;
  entries: LedgerEntry[];
};

/** Opening balance at the start of `from`, the charges and payments dated
 * `from`…`to` (inclusive) and the closing balance at the end of `to`. */
export function buildStatement(invoices: Invoice[], from: string, to: string): StatementSummary {
  const all = ledgerEntries(invoices);
  const before = all.filter((e) => e.date < from);
  const within = all.filter((e) => e.date >= from && e.date <= to);
  const openingBalance = before.length ? before[before.length - 1].balance : 0;
  const totalCharges = round2(within.filter((e) => e.kind === "charge").reduce((s, e) => s + e.amount, 0));
  const totalPayments = round2(within.filter((e) => e.kind === "payment").reduce((s, e) => s + e.amount, 0));
  return {
    from,
    to,
    openingBalance,
    totalCharges,
    totalPayments,
    closingBalance: round2(openingBalance + totalCharges - totalPayments),
    entries: within,
  };
}

/** Current balance and overdue portion for one family account. */
export function accountBalances(invoices: Invoice[], today: string) {
  let outstanding = 0;
  let overdue = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    if (inv.status !== "sent") continue;
    outstanding += inv.total_due;
    unpaidCount += 1;
    if (inv.due_date && inv.due_date < today) {
      overdue += inv.total_due;
      overdueCount += 1;
    }
  }
  return { outstanding: round2(outstanding), overdue: round2(overdue), unpaidCount, overdueCount };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
