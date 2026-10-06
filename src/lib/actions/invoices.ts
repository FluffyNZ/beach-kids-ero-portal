"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyFeesByFamily } from "@/lib/data/fees";
import { getInvoiceById, getFamilyStatements } from "@/lib/data/invoices";
import { getResendClient, getInvoiceFromAddress } from "@/lib/email/resend-client";
import { renderInvoiceEmail, renderStatementEmail } from "@/lib/email/invoice-email";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Assumption, not asked about yet: invoices are due a week after they're
// issued. Change this one constant if you'd rather bill on different terms.
const INVOICE_DUE_DAYS = 7;

/** Freezes one family's current Fees by family numbers into a new draft
 * invoice — a snapshot, not a live view, so editing hours afterwards never
 * silently changes what was already billed. Blocked by a DB constraint
 * (not just this check) from creating a second active invoice for the same
 * family + week, so re-running this after a draft already exists for that
 * week just surfaces a clear error instead of double-billing. */
export async function createDraftInvoice(billPayerId: string, weekStartDate: string): Promise<{ id: string }> {
  const summary = await getWeeklyFeesByFamily(weekStartDate);
  const family = summary.families.find((f) => f.bill_payer_id === billPayerId);
  if (!family) throw new Error("Couldn't find this family's fees for that week.");

  const supabase = createClient();
  const userId = await currentUserId();

  const issuedDate = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: invoiceRow, error } = await supabase
    .from("invoices")
    .insert({
      bill_payer_id: billPayerId,
      week_start_date: weekStartDate,
      subtotal: family.totalFeeTotal,
      winz_total: family.totalWinz,
      total_due: family.totalParentPays,
      issued_date: issuedDate,
      due_date: dueDate,
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !invoiceRow) {
    if (error?.code === "23505") {
      throw new Error("An invoice already exists for this family for this week — void it first if you need to redo it.");
    }
    throw new Error(`Could not create the invoice: ${error?.message ?? "unknown error"}`);
  }

  const lineItems = family.children.map((child) => ({
    invoice_id: invoiceRow.id,
    child_id: child.child_id,
    child_name: child.full_name,
    room_name: child.room_name,
    fee_total: child.fee_total,
    winz_payment: child.winz_payment,
    parent_pays: child.parent_pays,
    is_estimated: child.is_estimated,
  }));

  const { error: lineError } = await supabase.from("invoice_line_items").insert(lineItems as any);
  if (lineError) {
    throw new Error(`The invoice was created but its line items failed to save: ${lineError.message}`);
  }

  revalidatePath("/finances/invoices");
  revalidatePath("/finances/statements");
  revalidatePath("/children/fees-by-family");
  return { id: invoiceRow.id };
}

/** Emails one invoice to its family via Resend, then marks it sent. Will
 * throw with a plain-language message if RESEND_API_KEY hasn't been set up
 * yet, or if the family has no email address on file — nothing silently
 * fails here. */
export async function sendInvoice(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "void") throw new Error("This invoice has been voided.");
  if (!invoice.bill_payer_email) {
    throw new Error("This family has no email address on file — add one to their bill payer details first.");
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getInvoiceFromAddress(),
    to: invoice.bill_payer_email,
    subject: `Invoice ${invoice.invoice_number} — Beach Kids`,
    html: renderInvoiceEmail(invoice),
  });
  if (error) throw new Error(`Resend couldn't send this email: ${error.message}`);

  const supabase = createClient();
  const { error: updateError } = await (supabase.from("invoices") as any)
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_to_email: invoice.bill_payer_email })
    .eq("id", invoiceId);
  if (updateError) {
    throw new Error(`The email was sent, but the invoice couldn't be marked as sent: ${updateError.message}`);
  }

  revalidatePath("/finances/invoices");
  revalidatePath("/finances/statements");
}

/** Toggles an invoice between "sent" (outstanding) and "paid" — this is the
 * manual step that keeps the "currently owing" statement figure accurate,
 * since there's no live bank/Xero reconciliation wired in yet. */
export async function markInvoicePaid(invoiceId: string, paid: boolean) {
  const supabase = createClient();
  const { error } = await (supabase.from("invoices") as any)
    .update({
      status: paid ? "paid" : "sent",
      paid_at: paid ? new Date().toISOString() : null,
      // Undoing a paid mark also clears any Xero match, so the invoice is
      // genuinely outstanding again rather than stuck "already matched"
      // the next time a Xero sync runs against it (see migration 0043).
      ...(paid ? {} : { xero_transaction_id: null, xero_matched_at: null }),
    })
    .eq("id", invoiceId);
  if (error) throw new Error(`Could not update this invoice: ${error.message}`);

  revalidatePath("/finances/invoices");
  revalidatePath("/finances/statements");
  revalidatePath("/finances/xero");
}

/** Voids an invoice (e.g. it was drafted by mistake, or needs redoing) —
 * kept in the table rather than deleted, and frees up that family + week
 * to have a fresh invoice drafted for it. */
export async function voidInvoice(invoiceId: string) {
  const supabase = createClient();
  const { error } = await (supabase.from("invoices") as any).update({ status: "void" }).eq("id", invoiceId);
  if (error) throw new Error(`Could not void this invoice: ${error.message}`);

  revalidatePath("/finances/invoices");
  revalidatePath("/finances/statements");
}

/** Emails a family a summary of everything they currently owe (every sent
 * invoice that isn't paid or voided yet), in one message — for chasing up
 * an overdue balance rather than re-sending each invoice individually. */
export async function sendStatement(billPayerId: string) {
  const statements = await getFamilyStatements();
  const statement = statements.find((s) => s.bill_payer_id === billPayerId);
  if (!statement) throw new Error("This family has nothing currently outstanding to send a statement for.");
  if (!statement.bill_payer_email) {
    throw new Error("This family has no email address on file — add one to their bill payer details first.");
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getInvoiceFromAddress(),
    to: statement.bill_payer_email,
    subject: "Statement of account — Beach Kids",
    html: renderStatementEmail(statement),
  });
  if (error) throw new Error(`Resend couldn't send this email: ${error.message}`);

  revalidatePath("/finances/statements");
}
