"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FinanceIncomeSource } from "@/lib/supabase/database.types";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type OutgoingInput = {
  expense_date: string;
  supplier?: string | null;
  category?: string | null;
  description?: string | null;
  amount: number;
  gst_amount?: number | null;
  due_date?: string | null;
  notes?: string | null;
};

export async function addOutgoing(input: OutgoingInput) {
  if (!input.expense_date) throw new Error("Enter the expense date.");
  if (!(input.amount > 0)) throw new Error("Enter an amount greater than zero.");

  const supabase = createClient();
  const userId = await currentUserId();

  const { error } = await supabase.from("finance_outgoings").insert({
    expense_date: input.expense_date,
    supplier: input.supplier?.trim() || null,
    category: input.category?.trim() || null,
    description: input.description?.trim() || null,
    amount: input.amount,
    gst_amount: input.gst_amount ?? null,
    due_date: input.due_date || null,
    notes: input.notes?.trim() || null,
    status: "unpaid",
    created_by: userId,
  } as any);

  if (error) throw new Error(`Could not add this outgoing: ${error.message}`);
  revalidatePath("/finances");
  revalidatePath("/finances/outgoings");
}

export async function setOutgoingPaid(id: string, paid: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("finance_outgoings")
    .update({
      status: paid ? "paid" : "unpaid",
      paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
    } as any)
    .eq("id", id);

  if (error) throw new Error(`Could not update this outgoing: ${error.message}`);
  revalidatePath("/finances");
  revalidatePath("/finances/outgoings");
}

export type BulkOutgoingImportRow = {
  external_id: string;
  expense_date: string;
  supplier?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  amount: number;
  gst_amount?: number | null;
  xero_account?: string | null;
  needs_more_detail?: boolean;
  raw_description?: string | null;
  source_detail?: string | null;
  source_reference?: string | null;
  notes?: string | null;
  /** Historical imports (e.g. a Xero export) are typically already paid —
   * pass "unpaid" explicitly for anything still owed. */
  status?: "paid" | "unpaid";
  paid_date?: string | null;
};

/** Bulk-imports outgoings from an external accounting export (e.g. Xero).
 * Idempotent by `external_id`: rows whose external_id already exists in the
 * table are skipped rather than re-inserted, so this can be safely re-run
 * on an updated export without duplicating anything already imported. */
export async function bulkImportOutgoings(rows: BulkOutgoingImportRow[]) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("No rows to import.");
  for (const row of rows) {
    if (!row.external_id) throw new Error("Every row needs an external_id.");
    if (!row.expense_date) throw new Error(`Row ${row.external_id} is missing an expense date.`);
    if (!(row.amount > 0)) throw new Error(`Row ${row.external_id} needs an amount greater than zero.`);
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const externalIds = rows.map((r) => r.external_id);
  const { data: existing, error: existingError } = await supabase
    .from("finance_outgoings")
    .select("external_id")
    .in("external_id", externalIds);
  if (existingError) throw new Error(`Could not check for already-imported rows: ${existingError.message}`);

  const existingIds = new Set((existing ?? []).map((r) => r.external_id));
  const toInsert = rows.filter((r) => !existingIds.has(r.external_id));

  if (toInsert.length === 0) {
    return { inserted: 0, skippedDuplicates: rows.length };
  }

  const payload = toInsert.map((row) => ({
    expense_date: row.expense_date,
    supplier: row.supplier?.trim() || null,
    category: row.category?.trim() || null,
    subcategory: row.subcategory?.trim() || null,
    description: row.description?.trim() || null,
    amount: row.amount,
    gst_amount: row.gst_amount ?? null,
    status: row.status ?? "paid",
    paid_date: row.paid_date ?? (row.status === "unpaid" ? null : row.expense_date),
    notes: row.notes?.trim() || null,
    external_id: row.external_id,
    xero_account: row.xero_account?.trim() || null,
    needs_more_detail: row.needs_more_detail ?? false,
    raw_description: row.raw_description ?? null,
    source_detail: row.source_detail?.trim() || null,
    source_reference: row.source_reference?.trim() || null,
    created_by: userId,
  }));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("finance_outgoings").insert(chunk as any);
    if (error) throw new Error(`Import failed partway through (row batch starting at ${i}): ${error.message}`);
  }

  revalidatePath("/finances");
  revalidatePath("/finances/outgoings");
  return { inserted: toInsert.length, skippedDuplicates: rows.length - toInsert.length };
}

export async function deleteOutgoing(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("finance_outgoings").delete().eq("id", id);
  if (error) throw new Error(`Could not delete this outgoing: ${error.message}`);
  revalidatePath("/finances");
  revalidatePath("/finances/outgoings");
}

export type IncomeInput = {
  income_date: string;
  source: FinanceIncomeSource;
  payer_name?: string | null;
  description?: string | null;
  invoice_number?: string | null;
  amount: number;
  gst_amount?: number | null;
  due_date?: string | null;
  notes?: string | null;
  /** Set this when recording income that's already landed (including
   * backdated/historical entries) — pass the actual date it was received so
   * the record isn't stamped with today's date. Leave unset for money still
   * owed; use setIncomeReceived to flip it once it arrives. */
  received_date?: string | null;
};

export async function addIncome(input: IncomeInput) {
  if (!input.income_date) throw new Error("Enter the date.");
  if (!(input.amount > 0)) throw new Error("Enter an amount greater than zero.");

  const supabase = createClient();
  const userId = await currentUserId();

  const { error } = await supabase.from("finance_income").insert({
    income_date: input.income_date,
    source: input.source,
    payer_name: input.payer_name?.trim() || null,
    description: input.description?.trim() || null,
    invoice_number: input.invoice_number?.trim() || null,
    amount: input.amount,
    gst_amount: input.gst_amount ?? null,
    due_date: input.due_date || null,
    notes: input.notes?.trim() || null,
    status: input.received_date ? "received" : "pending",
    received_date: input.received_date || null,
    created_by: userId,
  } as any);

  if (error) throw new Error(`Could not add this income record: ${error.message}`);
  revalidatePath("/finances");
  revalidatePath("/finances/income");
}

export async function setIncomeReceived(id: string, received: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("finance_income")
    .update({
      status: received ? "received" : "pending",
      received_date: received ? new Date().toISOString().slice(0, 10) : null,
    } as any)
    .eq("id", id);

  if (error) throw new Error(`Could not update this income record: ${error.message}`);
  revalidatePath("/finances");
  revalidatePath("/finances/income");
}

export async function deleteIncome(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("finance_income").delete().eq("id", id);
  if (error) throw new Error(`Could not delete this income record: ${error.message}`);
  revalidatePath("/finances");
  revalidatePath("/finances/income");
}
