import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceLineItem, InvoiceStatus, FamilyStatement } from "@/lib/types";

/** Loads invoices (optionally filtered by status) together with their line
 * items and bill payer name/email — three independently-fetched
 * collections joined in JS by id, the same approach used for the
 * attendance roll and the Fees by family rollup, rather than a nested
 * Supabase select (nothing else in this codebase relies on those). */
export async function getInvoicesList(filters?: { status?: InvoiceStatus }): Promise<Invoice[]> {
  const supabase = createClient();

  let query = supabase.from("invoices").select("*").order("issued_date", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  const { data: invoiceRows, error } = await query;
  if (error) throw new Error(`Could not load invoices: ${error.message}`);
  if (!invoiceRows || invoiceRows.length === 0) return [];

  const invoiceIds = invoiceRows.map((r) => r.id);
  const billPayerIds = Array.from(new Set(invoiceRows.map((r) => r.bill_payer_id)));

  const [{ data: lineItemRows }, { data: billPayerRows }] = await Promise.all([
    supabase.from("invoice_line_items").select("*").in("invoice_id", invoiceIds),
    supabase.from("bill_payers").select("id, full_name, email").in("id", billPayerIds),
  ]);

  const lineItemsByInvoiceId = new Map<string, InvoiceLineItem[]>();
  (lineItemRows ?? []).forEach((row) => {
    const list = lineItemsByInvoiceId.get(row.invoice_id) ?? [];
    list.push({
      id: row.id,
      child_id: row.child_id,
      child_name: row.child_name,
      room_name: row.room_name,
      fee_total: row.fee_total,
      winz_payment: row.winz_payment,
      parent_pays: row.parent_pays,
      is_estimated: row.is_estimated,
    });
    lineItemsByInvoiceId.set(row.invoice_id, list);
  });

  const billPayerById = new Map((billPayerRows ?? []).map((b) => [b.id, b]));

  return invoiceRows.map((row) => {
    const billPayer = billPayerById.get(row.bill_payer_id);
    return {
      id: row.id,
      bill_payer_id: row.bill_payer_id,
      bill_payer_name: billPayer?.full_name ?? "Unknown family",
      bill_payer_email: billPayer?.email ?? null,
      week_start_date: row.week_start_date,
      invoice_number: row.invoice_number,
      status: row.status,
      subtotal: row.subtotal,
      winz_total: row.winz_total,
      total_due: row.total_due,
      issued_date: row.issued_date,
      due_date: row.due_date,
      sent_at: row.sent_at,
      sent_to_email: row.sent_to_email,
      paid_at: row.paid_at,
      notes: row.notes,
      created_at: row.created_at,
      line_items: lineItemsByInvoiceId.get(row.id) ?? [],
      xero_transaction_id: row.xero_transaction_id ?? null,
      xero_matched_at: row.xero_matched_at ?? null,
    };
  });
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getInvoicesList();
  return invoices.find((i) => i.id === id) ?? null;
}

/** Every family with at least one sent-but-unpaid invoice, and what they
 * currently owe in total — the figure a statement would show. A family
 * that's fully paid up (or only has drafts/voids) doesn't appear here. */
export async function getFamilyStatements(): Promise<FamilyStatement[]> {
  const sentInvoices = await getInvoicesList({ status: "sent" });

  const byBillPayer = new Map<string, FamilyStatement>();
  sentInvoices.forEach((invoice) => {
    const existing = byBillPayer.get(invoice.bill_payer_id);
    if (existing) {
      existing.outstandingInvoices.push(invoice);
      existing.totalOwing += invoice.total_due;
    } else {
      byBillPayer.set(invoice.bill_payer_id, {
        bill_payer_id: invoice.bill_payer_id,
        bill_payer_name: invoice.bill_payer_name,
        bill_payer_email: invoice.bill_payer_email,
        outstandingInvoices: [invoice],
        totalOwing: invoice.total_due,
      });
    }
  });

  return Array.from(byBillPayer.values()).sort((a, b) => b.totalOwing - a.totalOwing);
}
