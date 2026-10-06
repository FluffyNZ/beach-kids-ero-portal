"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureValidXeroAccessToken } from "@/lib/data/xero";
import { getXeroReceivedPayments } from "@/lib/xero/client";
import { getInvoicesList } from "@/lib/data/invoices";
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

/** Reads recent "money received" transactions from the connected Xero
 * bank account and proposes matches against every currently-outstanding
 * invoice, purely by comparing amounts — nothing is written to the
 * database here. A payment/invoice pair only goes into confidentMatches
 * when the amount is unique on both sides; any amount shared by more than
 * one payment or more than one invoice is surfaced as ambiguous instead
 * of guessed at. Nothing is ever marked paid until confirmXeroMatch runs
 * on a specific pairing. */
export async function syncXeroPayments(): Promise<XeroSyncResult> {
  const supabase = createClient();
  const { data: connection } = await supabase.from("xero_connection").select("*").eq("id", true).maybeSingle();
  if (!connection?.bank_account_id) {
    throw new Error("Connect Xero and choose a bank account first.");
  }

  const tokenInfo = await ensureValidXeroAccessToken();
  if (!tokenInfo) throw new Error("Xero isn't connected — reconnect it first.");

  const [payments, allInvoices] = await Promise.all([
    getXeroReceivedPayments(tokenInfo.accessToken, tokenInfo.tenantId, connection.bank_account_id),
    getInvoicesList(),
  ]);

  const usedTransactionIds = new Set(
    allInvoices.filter((inv) => inv.xero_transaction_id).map((inv) => inv.xero_transaction_id as string)
  );
  const outstandingInvoices = allInvoices.filter((inv) => inv.status === "sent");
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
      ambiguousMatches.push({ payment, candidates: candidateInvoices });
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
