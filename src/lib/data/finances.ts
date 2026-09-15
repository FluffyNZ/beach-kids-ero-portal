import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyFeesSummary } from "@/lib/data/fees";
import { mondayOf, addDays, formatShortDate } from "@/lib/utils";
import type { FeeRevenueForPeriod, FinanceIncomeEntry, FinanceOutgoing, FinanceOverview } from "@/lib/types";

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
