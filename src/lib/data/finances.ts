import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyFeesSummary } from "@/lib/data/fees";
import { getInvoicesList } from "@/lib/data/invoices";
import { mondayOf, addDays, formatShortDate, isOverdue } from "@/lib/utils";
import { FINANCE_INCOME_SOURCE_LABEL } from "@/lib/constants";
import type {
  FeeRevenueForPeriod,
  FinanceIncomeEntry,
  FinanceOutgoing,
  FinanceOverview,
  Invoice,
} from "@/lib/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export type FinancePeriod = "month" | "funding_round" | "financial_year";

/** The calendar month containing `reference`, as a plain date range. */
export function getMonthRange(reference: Date = new Date()): { start: string; end: string; label: string } {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const start = ymd(y, m + 1, 1);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = ymd(y, m + 1, lastDay);
  const label = new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m, 1))
  );
  return { start, end, label };
}

/** NZ financial year (1 Apr – 31 Mar) containing `reference`. */
export function getFinancialYearRange(reference: Date = new Date()): { start: string; end: string; label: string } {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth(); // 0 = Jan
  const fyStartYear = m >= 3 ? y : y - 1; // April (index 3) onward belongs to the FY starting this calendar year
  const start = ymd(fyStartYear, 4, 1);
  const end = ymd(fyStartYear + 1, 3, 31);
  const label = `${fyStartYear}–${fyStartYear + 1} financial year (1 Apr – 31 Mar)`;
  return { start, end, label };
}

/** The MOE ECE operational funding round containing `reference` — MOE pays
 * three times a year, on the first working day of March, July and November,
 * each payment being a 4-month advance plus a wash-up for the previous
 * 4 months (per the published ECE Funding Handbook schedule: 1 Mar covers
 * Mar–Jun, 1 Jul covers Jul–Oct, ~1 Nov covers Nov–Feb). This returns the
 * 4-month advance block containing `reference`, labelled with the date it's
 * paid on, so "This funding round" lines up with what actually landed. */
export function getFundingRoundRange(reference: Date = new Date()): { start: string; end: string; label: string } {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth(); // 0 = Jan

  let startYear: number;
  let startMonth: number; // 0-based
  if (m >= 2 && m <= 5) {
    // Mar–Jun
    startYear = y;
    startMonth = 2;
  } else if (m >= 6 && m <= 9) {
    // Jul–Oct
    startYear = y;
    startMonth = 6;
  } else {
    // Nov–Feb (spans the calendar year boundary)
    startYear = m >= 10 ? y : y - 1;
    startMonth = 10;
  }

  const start = ymd(startYear, startMonth + 1, 1);
  const endMonthIndex = startMonth + 3;
  const endYear = startYear + Math.floor(endMonthIndex / 12);
  const endMonthNorm = endMonthIndex % 12;
  const lastDay = new Date(Date.UTC(endYear, endMonthNorm + 1, 0)).getUTCDate();
  const end = ymd(endYear, endMonthNorm + 1, lastDay);

  const paidOn = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(startYear, startMonth, 1))
  );
  const label = `Funding round paid ${paidOn} (${formatShortDate(start)} – ${formatShortDate(end)})`;
  return { start, end, label };
}

/** Every Monday (week start) that falls between `periodStart` and
 * `periodEnd` — a week is included if its Monday falls in range, even if
 * the week itself runs a little past the end of the period. Fee revenue is
 * grouped by week (matching how Children & Fees itself works), not sliced
 * to the exact day, so a week straddling a period boundary counts fully
 * toward whichever period its Monday falls in. Capped at 60 weeks so an
 * unexpectedly wide range can't trigger an unbounded loop. */
function weekStartsInRange(periodStart: string, periodEnd: string): string[] {
  const starts: string[] = [];
  let cursor = mondayOf(new Date(`${periodStart}T00:00:00Z`));
  let guard = 0;
  while (cursor <= periodEnd && guard < 60) {
    starts.push(cursor);
    cursor = addDays(cursor, 7);
    guard += 1;
  }
  return starts;
}

/** Parent + WINZ fee revenue across every week in the period, pulled live
 * from Children & Fees rather than re-entered — `confirmedWeeks` counts
 * weeks with real recorded attendance, `estimatedWeeks` counts weeks
 * falling back to each child's enrolled schedule because nobody confirmed
 * actual hours for that week. */
export async function getFeeRevenueForPeriod(periodStart: string, periodEnd: string): Promise<FeeRevenueForPeriod> {
  const weekStarts = weekStartsInRange(periodStart, periodEnd);
  const summaries = await Promise.all(weekStarts.map((weekStart) => getWeeklyFeesSummary(weekStart)));

  let totalParentPays = 0;
  let totalWinz = 0;
  let confirmedWeeks = 0;
  let estimatedWeeks = 0;

  summaries.forEach((summary) => {
    totalParentPays += summary.totalParentPays;
    totalWinz += summary.totalWinz;
    if (summary.hasAnyHoursEntered) confirmedWeeks += 1;
    else estimatedWeeks += 1;
  });

  return {
    totalParentPays,
    totalWinz,
    total: totalParentPays + totalWinz,
    confirmedWeeks,
    estimatedWeeks,
    totalWeeks: weekStarts.length,
  };
}

/** The Finances Overview: fee revenue (auto, from Children & Fees) plus
 * any other income actually received, set against outgoings recorded for
 * the same period — with a rough "estimated profit before tax" figure.
 * That figure is exactly what it says: income minus outgoings, not a tax
 * calculation, and not a substitute for your accountant's numbers. */
export async function getFinanceOverview(period: FinancePeriod): Promise<FinanceOverview> {
  const range =
    period === "month" ? getMonthRange() : period === "funding_round" ? getFundingRoundRange() : getFinancialYearRange();
  const supabase = createClient();

  const [feeRevenue, { data: incomeRows }, { data: outgoingRows }, { data: unpaidBills }, { data: pendingIncome }] =
    await Promise.all([
      getFeeRevenueForPeriod(range.start, range.end),
      supabase
        .from("finance_income")
        .select("amount")
        .eq("status", "received")
        .gte("income_date", range.start)
        .lte("income_date", range.end),
      supabase
        .from("finance_outgoings")
        .select("amount")
        .gte("expense_date", range.start)
        .lte("expense_date", range.end),
      supabase.from("finance_outgoings").select("amount").eq("status", "unpaid"),
      supabase.from("finance_income").select("amount").eq("status", "pending"),
    ]);

  const otherIncomeReceived = (incomeRows ?? []).reduce((sum, r) => sum + r.amount, 0);
  const totalOutgoings = (outgoingRows ?? []).reduce((sum, r) => sum + r.amount, 0);
  const totalIncome = feeRevenue.total + otherIncomeReceived;

  return {
    periodLabel: range.label,
    periodStart: range.start,
    periodEnd: range.end,
    feeRevenue,
    otherIncomeReceived,
    totalIncome,
    totalOutgoings,
    estimatedProfitBeforeTax: totalIncome - totalOutgoings,
    outstandingBillsCount: (unpaidBills ?? []).length,
    outstandingBillsAmount: (unpaidBills ?? []).reduce((sum, r) => sum + r.amount, 0),
    outstandingIncomeCount: (pendingIncome ?? []).length,
    outstandingIncomeAmount: (pendingIncome ?? []).reduce((sum, r) => sum + r.amount, 0),
  };
}

export async function getFinanceOutgoings(): Promise<FinanceOutgoing[]> {
  const supabase = createClient();
  const { data } = await supabase.from("finance_outgoings").select("*").order("expense_date", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    expense_date: r.expense_date,
    supplier: r.supplier,
    category: r.category,
    description: r.description,
    amount: r.amount,
    gst_amount: r.gst_amount,
    status: r.status,
    due_date: r.due_date,
    paid_date: r.paid_date,
    notes: r.notes,
    external_id: r.external_id,
    subcategory: r.subcategory,
    xero_account: r.xero_account,
    needs_more_detail: r.needs_more_detail,
    raw_description: r.raw_description,
    source_detail: r.source_detail,
    source_reference: r.source_reference,
  }));
}

export async function getFinanceIncome(): Promise<FinanceIncomeEntry[]> {
  const supabase = createClient();
  const { data } = await supabase.from("finance_income").select("*").order("income_date", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    income_date: r.income_date,
    source: r.source,
    payer_name: r.payer_name,
    description: r.description,
    invoice_number: r.invoice_number,
    amount: r.amount,
    gst_amount: r.gst_amount,
    status: r.status,
    due_date: r.due_date,
    received_date: r.received_date,
    notes: r.notes,
  }));
}

// ---------------------------------------------------------------------------
// Finance Overview redesign (2026-10-15) — a richer dashboard-shaped read on
// top of the data above, rather than a new source of truth. Every number
// here is derived from getFeeRevenueForPeriod (fees), getInvoicesList
// (parent fee invoices) and getFinanceIncome (other income) — the exact
// same three sources the pre-existing Overview/Invoices pages already read.
//
// Two distinctions the brief specifically asked for:
// - "Expected fee income" (feeRevenue.total) is what Children & Fees says is
//   owed for the period, confirmed weeks and schedule-estimated weeks alike.
//   It is NOT the same as money actually received.
// - "Money received" only counts amounts the system has an actual received
//   event for: an invoice marked paid (by its paid_at date) or a
//   finance_income row marked received (by its received_date). WINZ
//   payments are part of "expected fee income" (as they always have been —
//   see getFeeRevenueForPeriod/getFinanceOverview above) but are never
//   separately marked "received" anywhere in this schema, so they're
//   deliberately left out of "money received" rather than assumed received
//   — showing a figure the system can't actually back up would fail the
//   "missing data must not appear as a confirmed zero" rule in the other
//   direction (a confirmed non-zero that isn't actually confirmed).
// ---------------------------------------------------------------------------

/** One bar's worth of "money received" — either a calendar week or a
 * calendar month, depending on how long the selected period is (see
 * buildMoneyReceivedBuckets). */
export type MoneyReceivedBucket = { label: string; amount: number };

export type FinanceDashboard = {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  // Actual cash in for the period: paid invoices (by paid_at) + other
  // income marked received (by received_date). Excludes WINZ — see note
  // above.
  moneyReceived: number;
  moneyReceivedFromFees: number;
  moneyReceivedOtherIncome: number;
  moneyReceivedBuckets: MoneyReceivedBucket[];
  // What Children & Fees says this period is worth, parent + WINZ,
  // confirmed and estimated weeks alike — not the same as money received.
  expectedFeeIncome: number;
  feeRevenue: FeeRevenueForPeriod;
  otherIncomeReceived: number;
  // Current balance-sheet figures, not scoped to the selected period —
  // every sent-but-unpaid invoice right now, same definition the Invoices
  // page already uses (status === "sent", and isOverdue(due_date) for the
  // overdue slice of it).
  outstandingFeesAmount: number;
  outstandingFeesCount: number;
  overdueFeesAmount: number;
  overdueFeesCount: number;
};

function monthBucketsInRange(periodStart: string, periodEnd: string): Array<{ start: string; end: string; label: string }> {
  const buckets: Array<{ start: string; end: string; label: string }> = [];
  let [y, m] = periodStart.split("-").map(Number);
  let guard = 0;

  while (guard < 24) {
    const bucketStart = ymd(y, m, 1);
    if (bucketStart > periodEnd) break;

    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const naturalEnd = ymd(y, m, lastDay);
    const label = new Intl.DateTimeFormat("en-NZ", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));

    buckets.push({
      start: bucketStart < periodStart ? periodStart : bucketStart,
      end: naturalEnd > periodEnd ? periodEnd : naturalEnd,
      label,
    });

    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }

  return buckets;
}

/** Buckets the period into weeks (if it's short enough that stays
 * readable, e.g. "This month") or months (for the longer funding-round/
 * financial-year periods, where 17+ weekly bars would be unreadable) —
 * then sums actual money received (paid invoices + received other income)
 * into each one, for the Overview's "Money received" chart. */
function buildMoneyReceivedBuckets(
  periodStart: string,
  periodEnd: string,
  invoices: Invoice[],
  income: FinanceIncomeEntry[]
): MoneyReceivedBucket[] {
  const weekStarts = weekStartsInRange(periodStart, periodEnd);
  const useWeekly = weekStarts.length > 0 && weekStarts.length <= 8;

  const ranges = useWeekly
    ? weekStarts.map((weekStart) => {
        const naturalEnd = addDays(weekStart, 6);
        return {
          // weekStartsInRange groups by the fee-revenue convention (whichever
          // period a week's Monday falls in gets the whole week) — right for
          // estimating fee revenue, but "money received" is real dated cash
          // events, so each bucket is clamped back to the actual selected
          // period rather than spilling a few days into the adjacent one.
          start: weekStart < periodStart ? periodStart : weekStart,
          end: naturalEnd > periodEnd ? periodEnd : naturalEnd,
          label: formatShortDate(weekStart),
        };
      })
    : monthBucketsInRange(periodStart, periodEnd);

  return ranges.map((range) => {
    const fromInvoices = invoices
      .filter(
        (invoice) =>
          invoice.status === "paid" &&
          invoice.paid_at &&
          invoice.paid_at.slice(0, 10) >= range.start &&
          invoice.paid_at.slice(0, 10) <= range.end
      )
      .reduce((sum, invoice) => sum + invoice.total_due, 0);

    const fromIncome = income
      .filter(
        (row) =>
          row.status === "received" &&
          row.received_date &&
          row.received_date >= range.start &&
          row.received_date <= range.end
      )
      .reduce((sum, row) => sum + row.amount, 0);

    return { label: range.label, amount: fromInvoices + fromIncome };
  });
}

/** The Finance Overview's dashboard numbers for one period — see the
 * module comment above for the "expected" vs "received" distinction. */
export async function getFinanceDashboard(period: FinancePeriod): Promise<FinanceDashboard> {
  const range =
    period === "month" ? getMonthRange() : period === "funding_round" ? getFundingRoundRange() : getFinancialYearRange();

  const [feeRevenue, invoices, income] = await Promise.all([
    getFeeRevenueForPeriod(range.start, range.end),
    getInvoicesList(),
    getFinanceIncome(),
  ]);

  const sentInvoices = invoices.filter((invoice) => invoice.status === "sent");
  const outstandingFeesAmount = sentInvoices.reduce((sum, invoice) => sum + invoice.total_due, 0);
  const overdueSentInvoices = sentInvoices.filter((invoice) => isOverdue(invoice.due_date));
  const overdueFeesAmount = overdueSentInvoices.reduce((sum, invoice) => sum + invoice.total_due, 0);

  const moneyReceivedFromFees = invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" &&
        invoice.paid_at &&
        invoice.paid_at.slice(0, 10) >= range.start &&
        invoice.paid_at.slice(0, 10) <= range.end
    )
    .reduce((sum, invoice) => sum + invoice.total_due, 0);

  const otherIncomeReceived = income
    .filter(
      (row) =>
        row.status === "received" && row.received_date && row.received_date >= range.start && row.received_date <= range.end
    )
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    periodLabel: range.label,
    periodStart: range.start,
    periodEnd: range.end,
    moneyReceived: moneyReceivedFromFees + otherIncomeReceived,
    moneyReceivedFromFees,
    moneyReceivedOtherIncome: otherIncomeReceived,
    moneyReceivedBuckets: buildMoneyReceivedBuckets(range.start, range.end, invoices, income),
    expectedFeeIncome: feeRevenue.total,
    feeRevenue,
    otherIncomeReceived,
    outstandingFeesAmount,
    outstandingFeesCount: sentInvoices.length,
    overdueFeesAmount,
    overdueFeesCount: overdueSentInvoices.length,
  };
}

export type RecentPayment = {
  id: string;
  date: string;
  family: string;
  amount: number;
  method: string;
};

/** The most recent actual payment events — paid invoices (parent fees) and
 * received other income, merged into one feed and sorted newest-first.
 * Used by the Overview's "Recent payments" table; each row links back to
 * its source record's own page rather than anything new being invented
 * here. */
export async function getRecentPayments(limit = 8): Promise<RecentPayment[]> {
  const [invoices, income] = await Promise.all([getInvoicesList({ status: "paid" }), getFinanceIncome()]);

  const fromInvoices: RecentPayment[] = invoices
    .filter((invoice) => invoice.paid_at)
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      date: invoice.paid_at!.slice(0, 10),
      family: invoice.bill_payer_name,
      amount: invoice.total_due,
      method: invoice.xero_transaction_id ? "Bank transfer (Xero)" : "Marked paid manually",
    }));

  const fromIncome: RecentPayment[] = income
    .filter((row) => row.status === "received" && row.received_date)
    .map((row) => ({
      id: `income-${row.id}`,
      date: row.received_date!.slice(0, 10),
      family: row.payer_name || FINANCE_INCOME_SOURCE_LABEL[row.source],
      amount: row.amount,
      method: FINANCE_INCOME_SOURCE_LABEL[row.source],
    }));

  return [...fromInvoices, ...fromIncome]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit);
}
