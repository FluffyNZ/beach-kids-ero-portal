import type { Invoice } from "@/lib/types";
import type { PillTone } from "@/components/ui/status-pill";

// Shared, client-safe formatting and status rules for the Finance area.
// Dates are shown in NZ format; timestamps are converted to the NZ calendar
// date before comparing or grouping them.

const dateFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dayMonthFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });
const monthYearFmt = new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
const nzDateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" });
const nzTimeFmt = new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit", timeZone: "Pacific/Auckland" });

function utc(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** The NZ calendar date ("YYYY-MM-DD") of a timestamp. */
export function nzDateOf(timestamp: string): string {
  return nzDateFmt.format(new Date(timestamp));
}

/** "18 Nov 2026" for a "YYYY-MM-DD" date; "—" when missing. */
export function fmtDate(date: string | null | undefined): string {
  if (!date) return "—";
  return dateFmt.format(utc(date));
}

/** "18 Nov 2026, 2:05 pm" (NZ time) for a timestamp. */
export function fmtDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  return `${fmtDate(nzDateOf(timestamp))}, ${nzTimeFmt.format(new Date(timestamp))}`;
}

export function fmtMonthYear(date: string): string {
  return monthYearFmt.format(utc(date));
}

function addDaysTo(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A billing week (Mon–Fri) as "5–9 Oct 2026" or "29 Sept – 3 Oct 2026". */
export function fmtWeek(weekStart: string): string {
  const end = addDaysTo(weekStart, 4);
  if (weekStart.slice(0, 7) === end.slice(0, 7)) return `${Number(weekStart.slice(8, 10))}–${fmtDate(end)}`;
  if (weekStart.slice(0, 4) === end.slice(0, 4)) return `${dayMonthFmt.format(utc(weekStart))} – ${fmtDate(end)}`;
  return `${fmtDate(weekStart)} – ${fmtDate(end)}`;
}

/** "1 Oct – 31 Oct 2026" for an inclusive date range. */
export function fmtRange(from: string, to: string): string {
  if (from.slice(0, 4) === to.slice(0, 4)) return `${dayMonthFmt.format(utc(from))} – ${fmtDate(to)}`;
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

// ---------------------------------------------------------------------------
// Invoice status and balance
// ---------------------------------------------------------------------------

export type InvoiceStateKey = "draft" | "unpaid" | "overdue" | "paid" | "void";

export const INVOICE_STATE_LABEL: Record<InvoiceStateKey, string> = {
  draft: "Draft",
  unpaid: "Unpaid",
  overdue: "Overdue",
  paid: "Paid",
  void: "Void",
};

export const INVOICE_STATE_TONE: Record<InvoiceStateKey, PillTone> = {
  draft: "neutral",
  unpaid: "attention",
  overdue: "action",
  paid: "ready",
  void: "neutral",
};

type InvoiceLike = Pick<Invoice, "status" | "due_date">;

/** Overdue = sent, unpaid and past its due date (NZ date). */
export function invoiceState(invoice: InvoiceLike, today: string): InvoiceStateKey {
  if (invoice.status === "draft") return "draft";
  if (invoice.status === "void") return "void";
  if (invoice.status === "paid") return "paid";
  return invoice.due_date && invoice.due_date < today ? "overdue" : "unpaid";
}

/** What's still owed on an invoice: the full amount while it's sent and
 * unpaid, nothing once paid. Drafts and void invoices aren't owed at all
 * (null). Part payments aren't recorded in Earlydesk. */
export function invoiceBalance(invoice: Pick<Invoice, "status" | "total_due">): number | null {
  if (invoice.status === "sent") return invoice.total_due;
  if (invoice.status === "paid") return 0;
  return null;
}

/** Sent with "Send test email" rather than to the family. */
export function sentAsTest(invoice: Pick<Invoice, "sent_to_email">): boolean {
  return Boolean(invoice.sent_to_email?.startsWith("TEST"));
}

export function paymentMethodLabel(invoice: Pick<Invoice, "xero_transaction_id">): string {
  return invoice.xero_transaction_id ? "Matched to a Xero bank transaction" : "Recorded in Earlydesk";
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
