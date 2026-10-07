import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getInvoicesList } from "@/lib/data/invoices";
import type { BillPayer } from "@/lib/types";

export type BillPayerSummary = BillPayer & {
  // Active children currently billed to this person — a family whose
  // kids have all left still keeps their bill payer record (for history
  // and any outstanding balance), but drops out of this count.
  activeChildrenCount: number;
  childNames: string[];
  // Every sent-but-unpaid invoice's total, added up — same figure
  // Statements shows, just available per-client here too.
  totalOwing: number;
};

/** Every bill payer (family) in the system, regardless of whether they
 * currently owe anything — the "Clients" directory. Active-children count
 * and current balance are both derived here by joining in JS (same
 * approach already used across Finances/Fees), not stored on bill_payers
 * itself. */
export async function getBillPayersList(): Promise<BillPayerSummary[]> {
  const supabase = createClient();

  const [{ data: billPayerRows, error }, { data: childRows }, sentInvoices] = await Promise.all([
    supabase.from("bill_payers").select("*").order("full_name", { ascending: true }),
    supabase.from("children").select("id, full_name, bill_payer_id").eq("status", "active"),
    getInvoicesList({ status: "sent" }),
  ]);
  if (error) throw new Error(`Could not load clients: ${error.message}`);

  const childrenByBillPayer = new Map<string, string[]>();
  (childRows ?? []).forEach((c) => {
    if (!c.bill_payer_id) return;
    const list = childrenByBillPayer.get(c.bill_payer_id) ?? [];
    list.push(c.full_name);
    childrenByBillPayer.set(c.bill_payer_id, list);
  });

  const owingByBillPayer = new Map<string, number>();
  sentInvoices.forEach((inv) => {
    owingByBillPayer.set(inv.bill_payer_id, (owingByBillPayer.get(inv.bill_payer_id) ?? 0) + inv.total_due);
  });

  return (billPayerRows ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    activeChildrenCount: childrenByBillPayer.get(row.id)?.length ?? 0,
    childNames: childrenByBillPayer.get(row.id) ?? [],
    totalOwing: owingByBillPayer.get(row.id) ?? 0,
  }));
}
