"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStatementData, STATEMENT_TEMPLATE_KEY } from "@/lib/data/finance-hub";
import { getInvoiceFromAddress, getResendClient } from "@/lib/email/resend-client";
import { renderPeriodStatementEmail } from "@/lib/email/invoice-email";
import { fmtRange } from "@/lib/finance-format";

export type SendStatementResult = { success: true; recipient: string } | { success: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Emails one family account its statement for `from`…`to`. The statement
 * is rebuilt here from the invoices on file (not taken from the browser),
 * sent to the email on the family account, and recorded in Email history.
 * `expectedRecipient` and `expectedClosing` must match what the person
 * confirmed, so a change in between stops the send. */
export async function sendPeriodStatement(input: {
  billPayerId: string;
  from: string;
  to: string;
  expectedRecipient: string;
  expectedClosing: number;
}): Promise<SendStatementResult> {
  if (!DATE.test(input.from) || !DATE.test(input.to) || input.from > input.to) {
    return { success: false, error: "Choose a valid statement period." };
  }
  const data = await getStatementData(input.billPayerId, input.from, input.to);
  if (!data) return { success: false, error: "This family account couldn't be found." };
  const recipient = data.account.email?.trim();
  if (!recipient) return { success: false, error: "This family account has no email address. Add one before sending." };
  if (recipient !== input.expectedRecipient) {
    return { success: false, error: "The family account's email changed since the preview was opened. Check the preview and try again." };
  }
  if (Math.abs(data.statement.closingBalance - input.expectedClosing) > 0.005) {
    return { success: false, error: "The balances changed since the preview was opened. Check the preview and try again." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subject = `Statement ${fmtRange(input.from, input.to)} — Beach Kids`;
  const html = renderPeriodStatementEmail(data.account, data.statement);

  const { data: logRow, error: logError } = await (supabase.from("email_messages") as any)
    .insert({
      template_key: STATEMENT_TEMPLATE_KEY,
      bill_payer_id: input.billPayerId,
      recipient_name: data.account.full_name,
      recipient_email: recipient,
      subject,
      body: html,
      status: "sending",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (logError || !logRow) {
    return { success: false, error: `The statement wasn't sent — its history record couldn't be created: ${logError?.message ?? "unknown error"}` };
  }

  let providerId: string | null = null;
  try {
    const resend = getResendClient();
    const { data: sent, error } = await resend.emails.send({ from: getInvoiceFromAddress(), to: recipient, subject, html });
    if (error) throw new Error(error.message);
    providerId = sent?.id ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await (supabase.from("email_messages") as any).update({ status: "failed", error_message: message }).eq("id", logRow.id);
    revalidatePath(`/finances/clients/${input.billPayerId}`);
    revalidatePath("/finances/statements");
    return { success: false, error: `The statement wasn't sent: ${message}` };
  }

  await (supabase.from("email_messages") as any)
    .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerId })
    .eq("id", logRow.id);

  revalidatePath(`/finances/clients/${input.billPayerId}`);
  revalidatePath("/finances/statements");
  revalidatePath("/email/history");
  return { success: true, recipient };
}
