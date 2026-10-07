import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeeklyFeesByFamily } from "@/lib/data/fees";
import { mondayOf } from "@/lib/utils";

// Same billing terms as the manual draft flow (src/lib/actions/invoices.ts)
// — kept as a separate constant here rather than importing that file's,
// since this runs with no logged-in user and deliberately doesn't share
// any code path with the (session-authenticated) Server Actions.
const INVOICE_DUE_DAYS = 7;

export type WeeklyAutoDraftResult = {
  weekStartDate: string;
  created: number;
  skippedNoFee: number;
  alreadyExisted: number;
  failed: { billPayerName: string; error: string }[];
};

/** Drafts this week's invoice for every active family that owes something
 * — same numbers, same uniqueness guarantee (one invoice per family per
 * week) as clicking "Create draft" by hand on Fees by Family, just done
 * for everyone at once. Deliberately only DRAFTS; nothing is ever emailed
 * from here — that's still a manual "Send invoice" click, by design (see
 * the cron route this is called from). Runs with the Supabase service-role
 * client since a cron-triggered request has no logged-in user/session for
 * ordinary RLS-protected writes to authenticate as. */
export async function createWeeklyDraftInvoices(): Promise<WeeklyAutoDraftResult> {
  const weekStartDate = mondayOf(new Date());
  const summary = await getWeeklyFeesByFamily(weekStartDate);
  const supabase = createAdminClient();

  const result: WeeklyAutoDraftResult = {
    weekStartDate,
    created: 0,
    skippedNoFee: 0,
    alreadyExisted: 0,
    failed: [],
  };

  for (const family of summary.families) {
    // Nothing to invoice this family for this week (e.g. fully WINZ-covered,
    // or zero hours entered yet) — skip rather than draft a $0 invoice.
    if (family.totalParentPays <= 0) {
      result.skippedNoFee++;
      continue;
    }

    const issuedDate = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: invoiceRow, error } = await supabase
      .from("invoices")
      .insert({
        bill_payer_id: family.bill_payer_id,
        week_start_date: weekStartDate,
        subtotal: family.totalFeeTotal,
        winz_total: family.totalWinz,
        total_due: family.totalParentPays,
        issued_date: issuedDate,
        due_date: dueDate,
        // No logged-in user triggered this — left null rather than
        // attributed to whoever happens to be signed in when it runs.
        created_by: null,
      })
      .select("id")
      .single();

    if (error || !invoiceRow) {
      if (error?.code === "23505") {
        // A draft already exists for this family + week (e.g. someone
        // drafted it by hand already this week) — not a failure.
        result.alreadyExisted++;
      } else {
        result.failed.push({ billPayerName: family.bill_payer_name, error: error?.message ?? "unknown error" });
      }
      continue;
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

    const { error: lineError } = await supabase.from("invoice_line_items").insert(lineItems);
    if (lineError) {
      result.failed.push({ billPayerName: family.bill_payer_name, error: `line items: ${lineError.message}` });
      continue;
    }

    result.created++;
  }

  return result;
}
