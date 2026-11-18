import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  getFeeRevenueForPeriod,
  getFinanceIncome,
  getFinancialYearRange,
  getFundingRoundRange,
  getMonthRange,
} from "@/lib/data/finances";
import { getInvoicesList } from "@/lib/data/invoices";
import { getWeeklyFeesByFamily, getWeeklyFeesSummary } from "@/lib/data/fees";
import { getXeroConnectionStatus } from "@/lib/data/xero";
import { FINANCE_INCOME_SOURCE_LABEL } from "@/lib/constants";
import { addDays, formatCurrency, mondayOfDateString, nzTodayDateString } from "@/lib/utils";
import { fmtDate, fmtRange, fmtWeek, invoiceState, nzDateOf, plural, sentAsTest } from "@/lib/finance-format";
import { accountBalances, buildStatement, ledgerEntries, round2, type LedgerEntry, type StatementSummary } from "@/lib/finance-ledger";
import type { BillPayer, ChildWeeklyFee, FeeRevenueForPeriod, FinanceIncomeEntry, Invoice } from "@/lib/types";

// Read-only views for the Finance area, built on the existing loaders
// (getInvoicesList, getFinanceIncome, getWeeklyFeesSummary/ByFamily,
// getFeeRevenueForPeriod). Nothing here changes how fees, invoices or
// payments are calculated or stored.

// ---------------------------------------------------------------------------
// Reporting periods
// ---------------------------------------------------------------------------

export type FinancePeriodKey = "month" | "last_month" | "funding_round" | "financial_year";

export const FINANCE_PERIOD_OPTIONS: Array<{ key: FinancePeriodKey; label: string }> = [
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "funding_round", label: "This funding round" },
  { key: "financial_year", label: "This financial year" },
];

export type ResolvedPeriod = { key: FinancePeriodKey; start: string; end: string; label: string; dates: string; current: boolean };

export function parsePeriodKey(value: string | undefined): FinancePeriodKey {
  return FINANCE_PERIOD_OPTIONS.some((o) => o.key === value) ? (value as FinancePeriodKey) : "month";
}

export function resolvePeriod(key: FinancePeriodKey, today: string): ResolvedPeriod {
  const ref = new Date(`${today}T00:00:00Z`);
  let range: { start: string; end: string; label: string };
  if (key === "last_month") {
    range = getMonthRange(new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1)));
  } else if (key === "funding_round") {
    range = getFundingRoundRange(ref);
  } else if (key === "financial_year") {
    const fy = getFinancialYearRange(ref);
    range = { ...fy, label: `${fy.start.slice(0, 4)}–${fy.end.slice(0, 4)} financial year` };
  } else {
    range = getMonthRange(ref);
  }
  const current = range.start <= today && today <= range.end;
  const label = key === "funding_round" ? `Funding round ${fmtRange(range.start, range.end)}` : range.label;
  return { key, start: range.start, end: range.end, label, dates: fmtRange(range.start, range.end), current };
}

// ---------------------------------------------------------------------------
// Payments (actual money received)
// ---------------------------------------------------------------------------

export type PaymentEvent = {
  id: string;
  date: string;
  payer: string;
  amount: number;
  kind: "invoice" | "income";
  detail: string;
  href: string;
};

/** Every recorded payment: invoices marked paid (on their NZ paid date) and
 * other income marked received (on its received date). */
function paymentEvents(invoices: Invoice[], income: FinanceIncomeEntry[]): PaymentEvent[] {
  const fromInvoices: PaymentEvent[] = invoices
    .filter((i) => i.status === "paid" && i.paid_at)
    .map((i) => ({
      id: `invoice-${i.id}`,
      date: nzDateOf(i.paid_at!),
      payer: i.bill_payer_name,
      amount: i.total_due,
      kind: "invoice",
      detail: `${i.invoice_number} · ${i.xero_transaction_id ? "Xero bank transaction" : "Recorded in Earlydesk"}`,
      href: `/finances/invoices?invoice=${i.id}`,
    }));
  const fromIncome: PaymentEvent[] = income
    .filter((r) => r.status === "received" && r.received_date)
    .map((r) => ({
      id: `income-${r.id}`,
      date: r.received_date!.slice(0, 10),
      payer: r.payer_name || FINANCE_INCOME_SOURCE_LABEL[r.source],
      amount: r.amount,
      kind: "income",
      detail: FINANCE_INCOME_SOURCE_LABEL[r.source],
      href: "/finances/income",
    }));
  return [...fromInvoices, ...fromIncome].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export type ChartBucket = { label: string; start: string; end: string; amount: number; future: boolean };

function chartBuckets(period: ResolvedPeriod, payments: PaymentEvent[], today: string): ChartBucket[] {
  const ranges: Array<{ start: string; end: string; label: string }> = [];
  const days = (Date.parse(period.end) - Date.parse(period.start)) / 86400000;
  if (days <= 45) {
    let monday = mondayOfDateString(period.start);
    while (monday <= period.end) {
      const end = addDays(monday, 6);
      ranges.push({
        start: monday < period.start ? period.start : monday,
        end: end > period.end ? period.end : end,
        label: `w/c ${fmtDate(monday).replace(/ \d{4}$/, "")}`,
      });
      monday = addDays(monday, 7);
    }
    // Fold a short part-week at either end (e.g. a month starting on a
    // Sunday) into its neighbour, so every bar covers at least most of a week.
    const span = (r: { start: string; end: string }) => (Date.parse(r.end) - Date.parse(r.start)) / 86400000 + 1;
    if (ranges.length > 1 && span(ranges[0]) < 3) {
      const first = ranges.shift()!;
      ranges[0] = { ...ranges[0], start: first.start };
    }
    if (ranges.length > 1 && span(ranges[ranges.length - 1]) < 3) {
      const last = ranges.pop()!;
      ranges[ranges.length - 1] = { ...ranges[ranges.length - 1], end: last.end };
    }
  } else {
    let [y, m] = period.start.split("-").map(Number);
    for (let guard = 0; guard < 24; guard++) {
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      if (start > period.end) break;
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
      ranges.push({
        start: start < period.start ? period.start : start,
        end: end > period.end ? period.end : end,
        label: new Intl.DateTimeFormat("en-NZ", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1))),
      });
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }
  return ranges.map((r) => ({
    ...r,
    future: r.start > today,
    amount: round2(payments.filter((p) => p.date >= r.start && p.date <= r.end).reduce((s, p) => s + p.amount, 0)),
  }));
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type AttentionItem = { id: string; tone: "action" | "attention" | "neutral"; title: string; detail: string; href: string; linkLabel: string };

export type FinanceOverviewData = {
  today: string;
  period: ResolvedPeriod;
  received: { total: number; fromInvoices: number; fromOtherIncome: number; count: number };
  expected: FeeRevenueForPeriod;
  balances: { outstanding: number; overdue: number; unpaidCount: number; overdueCount: number };
  chart: ChartBucket[];
  recentPayments: PaymentEvent[];
  attention: AttentionItem[];
  invoiceCount: number;
};

export async function getFinanceOverviewData(key: FinancePeriodKey): Promise<FinanceOverviewData> {
  const today = nzTodayDateString();
  const period = resolvePeriod(key, today);
  const supabase = createClient();
  const thisWeek = mondayOfDateString(today);

  const [invoices, income, expected, xero, { data: unlinked }, { data: billedNoEmail }, { data: feeWeek }] = await Promise.all([
    getInvoicesList(),
    getFinanceIncome(),
    getFeeRevenueForPeriod(period.start, period.end),
    getXeroConnectionStatus(),
    supabase.from("children").select("id").eq("status", "active").is("bill_payer_id", null),
    supabase.from("children").select("bill_payer_id").eq("status", "active").not("bill_payer_id", "is", null),
    supabase.from("fee_weeks").select("id").eq("week_start_date", thisWeek).maybeSingle(),
  ]);

  const payments = paymentEvents(invoices, income);
  const inPeriod = payments.filter((p) => p.date >= period.start && p.date <= period.end);
  const fromInvoices = round2(inPeriod.filter((p) => p.kind === "invoice").reduce((s, p) => s + p.amount, 0));
  const fromOtherIncome = round2(inPeriod.filter((p) => p.kind === "income").reduce((s, p) => s + p.amount, 0));
  const balances = accountBalances(invoices, today);

  // Needs attention — each item links to the records behind it.
  const attention: AttentionItem[] = [];
  const sent = invoices.filter((i) => i.status === "sent");
  const overdueInvoices = sent.filter((i) => invoiceState(i, today) === "overdue");
  if (overdueInvoices.length > 2) {
    attention.push({
      id: "overdue",
      tone: "action",
      title: `${overdueInvoices.length} invoices are overdue`,
      detail: `${formatCurrency(balances.overdue)} across ${plural(new Set(overdueInvoices.map((i) => i.bill_payer_id)).size, "family account")}`,
      href: "/finances/invoices?status=overdue",
      linkLabel: "View overdue",
    });
  }
  for (const inv of overdueInvoices.length > 2 ? [] : overdueInvoices) {
    attention.push({
      id: `overdue-${inv.id}`,
      tone: "action",
      title: `${inv.invoice_number} is overdue`,
      detail: `${inv.bill_payer_name} · due ${fmtDate(inv.due_date)}`,
      href: `/finances/invoices?invoice=${inv.id}`,
      linkLabel: "Open invoice",
    });
  }
  for (const inv of sent.filter(sentAsTest)) {
    attention.push({
      id: `test-${inv.id}`,
      tone: "attention",
      title: `${inv.invoice_number} was sent as a test but counts as owed`,
      detail: `${inv.bill_payer_name} · void it if the family doesn't owe this`,
      href: `/finances/invoices?invoice=${inv.id}`,
      linkLabel: "Review invoice",
    });
  }
  const drafts = invoices.filter((i) => i.status === "draft");
  if (drafts.length > 0) {
    attention.push({
      id: "drafts",
      tone: "neutral",
      title: `${drafts.length} draft invoice${drafts.length === 1 ? "" : "s"} not sent`,
      detail: "Drafts aren't owed until they're sent",
      href: "/finances/invoices?status=draft",
      linkLabel: "View drafts",
    });
  }
  if (!feeWeek) {
    attention.push({
      id: "hours",
      tone: "attention",
      title: "This week's fees are estimates",
      detail: `No hours confirmed for the week of ${fmtWeek(thisWeek)}`,
      href: `/children/hours?week=${thisWeek}`,
      linkLabel: "Confirm hours",
    });
  }
  if ((unlinked ?? []).length > 0) {
    const n = (unlinked ?? []).length;
    attention.push({
      id: "unlinked",
      tone: "attention",
      title: `${n} enrolled ${n === 1 ? "child has" : "children have"} no family account`,
      detail: "Their fees can't be invoiced until one is linked",
      href: "/finances/fees?status=unlinked",
      linkLabel: "Review fees",
    });
  }
  const billedIds = Array.from(new Set((billedNoEmail ?? []).map((r: { bill_payer_id: string | null }) => r.bill_payer_id).filter(Boolean))) as string[];
  if (billedIds.length > 0) {
    const { data: payerRows } = await supabase.from("bill_payers").select("id, email").in("id", billedIds);
    const missing = (payerRows ?? []).filter((p: { email: string | null }) => !p.email?.trim()).length;
    if (missing > 0) {
      attention.push({
        id: "no-email",
        tone: "attention",
        title: `${missing} family account${missing === 1 ? " has" : "s have"} no email`,
        detail: "Invoices and statements can't be emailed to them",
        href: "/finances/clients?filter=no_email",
        linkLabel: "View family accounts",
      });
    }
  }
  const pendingIncome = income.filter((r) => r.status === "pending" && r.due_date && r.due_date < today);
  if (pendingIncome.length > 0) {
    attention.push({
      id: "income",
      tone: "attention",
      title: `${pendingIncome.length} expected income item${pendingIncome.length === 1 ? " is" : "s are"} past due`,
      detail: "Mark them received once the money arrives",
      href: "/finances/income",
      linkLabel: "View income",
    });
  }
  if (!xero.connected || !xero.bankAccountId) {
    attention.push({
      id: "xero",
      tone: "neutral",
      title: xero.connected ? "Xero bank account not chosen" : "Xero isn't connected",
      detail: "Payments can still be recorded by hand",
      href: "/finances/xero",
      linkLabel: "Open Connections",
    });
  }

  return {
    today,
    period,
    received: { total: round2(fromInvoices + fromOtherIncome), fromInvoices, fromOtherIncome, count: inPeriod.length },
    expected,
    balances,
    chart: chartBuckets(period, payments, today),
    recentPayments: payments.slice(0, 6),
    attention,
    invoiceCount: invoices.length,
  };
}

// ---------------------------------------------------------------------------
// Fees review
// ---------------------------------------------------------------------------

export type FeeReviewStatus = "estimated" | "ready" | "invoiced" | "changed" | "unlinked";

export type FeeReviewRow = {
  key: string;
  billPayerId: string | null;
  familyName: string;
  email: string | null;
  children: ChildWeeklyFee[];
  feeTotal: number;
  winz: number;
  parentPays: number;
  isEstimated: boolean;
  invoice: { id: string; number: string; state: ReturnType<typeof invoiceState>; total: number } | null;
  status: FeeReviewStatus;
};

export type FeeReviewData = {
  today: string;
  weekStart: string;
  hoursConfirmed: boolean;
  rows: FeeReviewRow[];
  totals: { families: number; parentPays: number; winz: number; feeTotal: number; unlinkedParentPays: number };
};

export async function getFeeReview(weekStart: string): Promise<FeeReviewData> {
  const today = nzTodayDateString();
  const [summary, byFamily, invoices] = await Promise.all([
    getWeeklyFeesSummary(weekStart),
    getWeeklyFeesByFamily(weekStart),
    getInvoicesList(),
  ]);
  const detailById = new Map(summary.children.map((c) => [c.child_id, c]));
  const weekInvoices = invoices.filter((i) => i.week_start_date === weekStart && i.status !== "void");

  const rows: FeeReviewRow[] = byFamily.families.map((f) => {
    const inv = weekInvoices.find((i) => i.bill_payer_id === f.bill_payer_id) ?? null;
    const invoice = inv ? { id: inv.id, number: inv.invoice_number, state: invoiceState(inv, today), total: inv.total_due } : null;
    const changed = invoice !== null && Math.abs(invoice.total - f.totalParentPays) > 0.005;
    return {
      key: f.bill_payer_id,
      billPayerId: f.bill_payer_id,
      familyName: f.bill_payer_name,
      email: f.bill_payer_email,
      children: f.children.map((c) => detailById.get(c.child_id)!).filter(Boolean),
      feeTotal: f.totalFeeTotal,
      winz: f.totalWinz,
      parentPays: f.totalParentPays,
      isEstimated: f.isEstimated,
      invoice,
      status: invoice ? (changed ? "changed" : "invoiced") : f.isEstimated ? "estimated" : "ready",
    };
  });

  if (byFamily.unassignedChildren.length > 0) {
    const kids = byFamily.unassignedChildren.map((c) => detailById.get(c.child_id)!).filter(Boolean);
    rows.push({
      key: "unlinked",
      billPayerId: null,
      familyName: "No family account linked",
      email: null,
      children: kids,
      feeTotal: kids.reduce((s, c) => s + c.fee_total, 0),
      winz: kids.reduce((s, c) => s + c.winz_payment, 0),
      parentPays: kids.reduce((s, c) => s + c.parent_pays, 0),
      isEstimated: kids.some((c) => c.is_estimated),
      invoice: null,
      status: "unlinked",
    });
  }

  const linked = rows.filter((r) => r.billPayerId);
  return {
    today,
    weekStart,
    hoursConfirmed: summary.hasAnyHoursEntered,
    rows,
    totals: {
      families: linked.length,
      parentPays: round2(linked.reduce((s, r) => s + r.parentPays, 0)),
      winz: round2(linked.reduce((s, r) => s + r.winz, 0)),
      feeTotal: round2(linked.reduce((s, r) => s + r.feeTotal, 0)),
      unlinkedParentPays: round2(rows.filter((r) => !r.billPayerId).reduce((s, r) => s + r.parentPays, 0)),
    },
  };
}

// ---------------------------------------------------------------------------
// Family accounts
// ---------------------------------------------------------------------------

export type FamilyAccountRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  children: string[];
  invoiceCount: number;
  outstanding: number;
  overdue: number;
  lastPayment: string | null;
};

export async function getFamilyAccounts(): Promise<{ today: string; rows: FamilyAccountRow[] }> {
  const today = nzTodayDateString();
  const supabase = createClient();
  const [{ data: payers, error }, { data: kids }, invoices] = await Promise.all([
    supabase.from("bill_payers").select("*").order("full_name", { ascending: true }),
    supabase.from("children").select("full_name, bill_payer_id").eq("status", "active"),
    getInvoicesList(),
  ]);
  if (error) throw new Error(`Could not load family accounts: ${error.message}`);

  const kidsByPayer = new Map<string, string[]>();
  (kids ?? []).forEach((k: { full_name: string; bill_payer_id: string | null }) => {
    if (!k.bill_payer_id) return;
    kidsByPayer.set(k.bill_payer_id, [...(kidsByPayer.get(k.bill_payer_id) ?? []), k.full_name]);
  });
  const invByPayer = new Map<string, Invoice[]>();
  invoices.forEach((i) => invByPayer.set(i.bill_payer_id, [...(invByPayer.get(i.bill_payer_id) ?? []), i]));

  const rows = (payers ?? []).map((p: BillPayer) => {
    const inv = invByPayer.get(p.id) ?? [];
    const b = accountBalances(inv, today);
    const paidDates = inv.filter((i) => i.status === "paid" && i.paid_at).map((i) => nzDateOf(i.paid_at!)).sort();
    return {
      id: p.id,
      name: p.full_name,
      email: p.email?.trim() || null,
      phone: p.phone?.trim() || null,
      children: (kidsByPayer.get(p.id) ?? []).sort((a, z) => a.localeCompare(z)),
      invoiceCount: inv.length,
      outstanding: b.outstanding,
      overdue: b.overdue,
      lastPayment: paidDates.length ? paidDates[paidDates.length - 1] : null,
    };
  });
  return { today, rows };
}

export type StatementSend = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
};

export const STATEMENT_TEMPLATE_KEY = "statement";

export async function getStatementHistory(billPayerId: string): Promise<StatementSend[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("email_messages")
    .select("id, recipient_email, subject, status, sent_at, created_at, error_message")
    .eq("template_key", STATEMENT_TEMPLATE_KEY)
    .eq("bill_payer_id", billPayerId)
    .order("created_at", { ascending: false })
    .limit(25);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    recipient: r.recipient_email,
    subject: r.subject,
    status: r.status,
    sentAt: r.sent_at,
    createdAt: r.created_at,
    error: r.error_message,
  }));
}

export type FamilyAccountDetail = {
  today: string;
  account: BillPayer;
  children: Array<{ id: string; full_name: string; status: string }>;
  invoices: Invoice[];
  ledger: LedgerEntry[];
  balances: ReturnType<typeof accountBalances>;
  payments: PaymentEvent[];
  statements: StatementSend[];
};

export async function getFamilyAccountDetail(id: string): Promise<FamilyAccountDetail | null> {
  const today = nzTodayDateString();
  const supabase = createClient();
  const { data: account } = await supabase.from("bill_payers").select("*").eq("id", id).maybeSingle();
  if (!account) return null;
  const [{ data: kids }, invoices, statements] = await Promise.all([
    supabase.from("children").select("id, full_name, status").eq("bill_payer_id", id).order("full_name"),
    getInvoicesList().then((all) => all.filter((i) => i.bill_payer_id === id)),
    getStatementHistory(id),
  ]);
  return {
    today,
    account: account as BillPayer,
    children: (kids ?? []) as Array<{ id: string; full_name: string; status: string }>,
    invoices,
    ledger: ledgerEntries(invoices),
    balances: accountBalances(invoices, today),
    payments: paymentEvents(invoices, []),
    statements,
  };
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export type StatementData = {
  today: string;
  account: BillPayer;
  children: string[];
  statement: StatementSummary;
  unpaid: Invoice[];
};

/** A family account's statement for `from`…`to`, from its invoices. */
export async function getStatementData(billPayerId: string, from: string, to: string): Promise<StatementData | null> {
  const today = nzTodayDateString();
  const supabase = createClient();
  const { data: account } = await supabase.from("bill_payers").select("*").eq("id", billPayerId).maybeSingle();
  if (!account) return null;
  const [{ data: kids }, invoices] = await Promise.all([
    supabase.from("children").select("full_name").eq("bill_payer_id", billPayerId).eq("status", "active").order("full_name"),
    getInvoicesList().then((all) => all.filter((i) => i.bill_payer_id === billPayerId)),
  ]);
  return {
    today,
    account: account as BillPayer,
    children: (kids ?? []).map((k: { full_name: string }) => k.full_name),
    statement: buildStatement(invoices, from, to),
    unpaid: invoices.filter((i) => i.status === "sent").sort((a, b) => (a.issued_date < b.issued_date ? -1 : 1)),
  };
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export function getEmailSendingStatus() {
  const configured = Boolean(process.env.RESEND_API_KEY);
  const fromAddress = process.env.INVOICE_FROM_EMAIL || null;
  return { configured, fromAddress };
}
