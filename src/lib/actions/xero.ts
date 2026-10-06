"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureValidXeroAccessToken } from "@/lib/data/xero";
import { getXeroReceivedPayments } from "@/lib/xero/client";
import { getInvoicesList } from "@/lib/data/invoices";
import { getChildrenList } from "@/lib/data/children";
import type { Invoice, XeroReceivedPayment, XeroSyncResult } from "@/lib/types";

export async function disconnectXero() {
  const supabase = createClient();
  const { error } = await (supabase.from("xero_connection") as any)
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      tenant_id: null,
      tenant_name: null,
      bank_account_id: null,
      bank_account_name: null,
      connected_at: null,
    })
    .eq("id", true);
  if (error) throw new Error(`Could not disconnect Xero: ${error.message}`);
  revalidatePath("/finances/xero");
}

export async function selectXeroBankAccount(accountId: string, accountName: string) {
  const supabase = createClient();
  const { error } = await (supabase.from("xero_connection") as any)
    .update({ bank_account_id: accountId, bank_account_name: accountName })
    .eq("id", true);
  if (error) throw new Error(`Could not save the selected bank account: ${error.message}`);
  revalidatePath("/finances/xero");
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

// --- Name matching -----------------------------------------------------
// Bank payment references are free text parents type themselves — no
// consistent format, often misspelled, shortened, or just a first name.
// This is a lightweight, dependency-free "does this look like the same
// family?" check: no fuzzy-matching package exists in this codebase yet
// and the API here (a handful of word comparisons) doesn't need one.

function nameTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// Plain Levenshtein edit distance between two short strings.
function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// True when two individual name words are "close enough" to count as the
// same word: identical, one is a prefix of the other (nicknames, initials,
// truncated bank text), or a small typo-sized edit distance relative to
// word length. Anything under 3 characters is only ever compared exactly,
// to avoid short words (e.g. "jo", "le") matching almost anything.
function wordsAreClose(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  const maxLen = Math.max(a.length, b.length);
  return levenshteinDistance(a, b) <= Math.max(1, Math.floor(maxLen * 0.25));
}

/** Does this Xero payment's own text (its bank reference and/or the
 * counterparty name Xero recorded) look like it came from this invoice's
 * family — either the bill payer or one of the children billed? Used only
 * to help pick between invoices that already share the same dollar amount;
 * it never substitutes for the amount match itself. */
function paymentLooksLikeFamily(payment: XeroReceivedPayment, invoice: Invoice): boolean {
  const paymentWords = nameTokens(`${payment.reference ?? ""} ${payment.contactName ?? ""}`);
  if (paymentWords.length === 0) return false;

  const candidateWords = nameTokens(
    [invoice.bill_payer_name, ...invoice.line_items.map((li) => li.child_name)].join(" ")
  );

  return candidateWords.some((cw) => paymentWords.some((pw) => wordsAreClose(cw, pw)));
}

/** Reads recent "money received" transactions from the connected Xero
 * bank account and proposes matches against every currently-outstanding
 * invoice for a currently-active child — nothing is written to the
 * database here. A payment/invoice pair only goes into confidentMatches
 * when the amount is unique on both sides, or when several invoices share
 * the amount but the payment's own text looks like it belongs to exactly
 * one of those families (checked against the bill payer's name and every
 * billed child's name, allowing for typos/short forms — never an exact
 * match requirement). Anything still shared by more than one plausible
 * family is surfaced as ambiguous instead of guessed at. Nothing is ever
 * marked paid until confirmXeroMatch runs on a specific pairing. */
export async function syncXeroPayments(): Promise<XeroSyncResult> {
  const supabase = createClient();
  const { data: connection } = await supabase.from("xero_connection").select("*").eq("id", true).maybeSingle();
  if (!connection?.bank_account_id) {
    throw new Error("Connect Xero and choose a bank account first.");
  }

  const tokenInfo = await ensureValidXeroAccessToken();
  if (!tokenInfo) throw new Error("Xero isn't connected — reconnect it first.");

  const [payments, allInvoices, activeChildren] = await Promise.all([
    getXeroReceivedPayments(tokenInfo.accessToken, tokenInfo.tenantId, connection.bank_account_id),
    getInvoicesList(),
    getChildrenList({ status: "active" }),
  ]);

  const activeChildIds = new Set(activeChildren.map((c) => c.id));

  const usedTransactionIds = new Set(
    allInvoices.filter((inv) => inv.xero_transaction_id).map((inv) => inv.xero_transaction_id as string)
  );
  // Only invoices still billing at least one currently-active (not left)
  // child — a family whose kids have all left stops being a match
  // candidate here, though any payment that still comes in for them will
  // simply show up as unmatched rather than silently vanishing.
  const outstandingInvoices = allInvoices.filter(
    (inv) => inv.status === "sent" && inv.line_items.some((li) => li.child_id && activeChildIds.has(li.child_id))
  );
  const unmatchedPaymentsPool = payments.filter((p) => !usedTransactionIds.has(p.bankTransactionId));

  // Group both sides by amount (rounded to cents as a string key to avoid
  // float-equality surprises).
  const invoicesByAmount = new Map<string, Invoice[]>();
  outstandingInvoices.forEach((inv) => {
    const key = inv.total_due.toFixed(2);
    const list = invoicesByAmount.get(key) ?? [];
    list.push(inv);
    invoicesByAmount.set(key, list);
  });

  const paymentsByAmount = new Map<string, XeroReceivedPayment[]>();
  unmatchedPaymentsPool.forEach((p) => {
    const key = p.amount.toFixed(2);
    const list = paymentsByAmount.get(key) ?? [];
    list.push(p);
    paymentsByAmount.set(key, list);
  });

  const confidentMatches: XeroSyncResult["confidentMatches"] = [];
  const ambiguousMatches: XeroSyncResult["ambiguousMatches"] = [];
  const unmatchedPayments: XeroReceivedPayment[] = [];
  const matchedInvoiceIds = new Set<string>();

  paymentsByAmount.forEach((paymentsAtAmount, amountKey) => {
    const candidateInvoices = invoicesByAmount.get(amountKey) ?? [];

    if (candidateInvoices.length === 0) {
      unmatchedPayments.push(...paymentsAtAmount);
      return;
    }

    if (candidateInvoices.length === 1 && paymentsAtAmount.length === 1) {
      confidentMatches.push({ invoice: candidateInvoices[0], payment: paymentsAtAmount[0] });
      matchedInvoiceIds.add(candidateInvoices[0].id);
      return;
    }

    paymentsAtAmount.forEach((payment) => {
      const nameMatches = candidateInvoices.filter((inv) => paymentLooksLikeFamily(payment, inv));

      // Several invoices share this amount, but the payment's own text
      // only looks like one of those families — that combination (same
      // amount + only one plausible name) is confident enough to offer
      // as a one-click confirm, same as a unique amount would be.
      if (nameMatches.length === 1) {
        confidentMatches.push({ invoice: nameMatches[0], payment });
        matchedInvoiceIds.add(nameMatches[0].id);
        return;
      }

      // Otherwise still ambiguous — but list any name-plausible
      // candidates first so the likelier picks are easiest to find.
      const likelyIds = new Set(nameMatches.map((inv) => inv.id));
      const orderedCandidates = [...candidateInvoices].sort((a, b) => {
        const aLikely = likelyIds.has(a.id) ? 0 : 1;
        const bLikely = likelyIds.has(b.id) ? 0 : 1;
        return aLikely - bLikely;
      });
      ambiguousMatches.push({ payment, candidates: orderedCandidates, likelyInvoiceIds: [...likelyIds] });
    });
  });

  const unmatchedInvoices = outstandingInvoices.filter((inv) => {
    if (matchedInvoiceIds.has(inv.id)) return false;
    const key = inv.total_due.toFixed(2);
    return !paymentsByAmount.has(key);
  });

  return {
    confidentMatches,
    ambiguousMatches,
    unmatchedPayments,
    unmatchedInvoices,
    syncedAt: new Date().toISOString(),
  };
}

/** The one place a Xero payment actually gets applied to an invoice —
 * always a specific invoice + a specific bank transaction, always a
 * deliberate click, never inferred automatically. Double-checks the
 * amount still matches and the invoice is still outstanding, in case
 * something changed since the sync was displayed. */
export async function confirmXeroMatch(invoiceId: string, payment: XeroReceivedPayment) {
  const supabase = createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("id, status, total_due, xero_transaction_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (fetchError || !invoice) throw new Error("Could not find that invoice.");
  if (invoice.status !== "sent") {
    throw new Error("This invoice is no longer outstanding — it may have already been marked paid or voided.");
  }
  if (invoice.xero_transaction_id) {
    throw new Error("This invoice has already been matched to a Xero payment.");
  }
  if (!amountsMatch(invoice.total_due, payment.amount)) {
    throw new Error("The amounts no longer match — re-sync before confirming this match.");
  }

  const { error } = await (supabase.from("invoices") as any)
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      xero_transaction_id: payment.bankTransactionId,
      xero_matched_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .is("xero_transaction_id", null);
  if (error) {
    if (error.code === "23505") {
      throw new Error("That Xero payment has already been matched to a different invoice.");
    }
    throw new Error(`Could not confirm this match: ${error.message}`);
  }

  revalidatePath("/finances/xero");
  revalidatePath("/finances/invoices");
  revalidatePath("/finances/statements");
}
