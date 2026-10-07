import "server-only";
import type { FamilyStatement, Invoice } from "@/lib/types";
import { formatCurrency, formatShortDate } from "@/lib/utils";

// Plain, email-client-safe inline styles — no external stylesheet, since
// most email clients strip <style> blocks or ignore them unpredictably.
const WRAP = "font-family: Arial, Helvetica, sans-serif; color: #353530; max-width: 480px; margin: 0 auto;";
const HEADING = "font-size: 20px; font-weight: bold; margin: 0 0 4px;";
const MUTED = "color: #353530; opacity: 0.6; font-size: 13px;";
const TABLE = "width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;";
const TH = "text-align: left; padding: 6px 4px; border-bottom: 1px solid #e5ded0; opacity: 0.6; font-size: 12px; text-transform: uppercase;";
const TD = "padding: 6px 4px; border-bottom: 1px solid #f0ead9;";
const TOTAL_ROW = "font-weight: bold; font-size: 16px;";
const SECTION = "font-size: 14px; line-height: 1.6; margin: 10px 0;";
const SUBHEAD = "font-weight: bold; font-size: 14px; margin: 18px 0 4px;";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Beach Kids Waihi's real payment details, exactly as Ethan gave them —
// never invent or alter these, they're real bank account information.
const BANK_ACCOUNT_NAME = "Beach Kids Waihi";
const BANK_ACCOUNT_NUMBER = "BNZ 02 0466 0345377 000";
const ADMIN_PHONE = "027 600 0705";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

// What a parent should put as their payment reference — their child's
// first name, or "or"-joined if the invoice bills more than one child.
function paymentReferenceSuggestion(invoice: Invoice): string {
  const names = Array.from(new Set(invoice.line_items.map((li) => firstName(li.child_name))));
  return names.join(" or ");
}

function lineItemsTable(invoice: Invoice): string {
  const rows = invoice.line_items
    .map(
      (li) => `
      <tr>
        <td style="${TD}">${escapeHtml(li.child_name)}${li.is_estimated ? " (estimated)" : ""}</td>
        <td style="${TD} text-align: right;">${formatCurrency(li.parent_pays)}</td>
      </tr>`
    )
    .join("");

  return `
    <table style="${TABLE}">
      <thead>
        <tr>
          <th style="${TH}">Child</th>
          <th style="${TH} text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td style="${TD} ${TOTAL_ROW}">Total due</td>
          <td style="${TD} ${TOTAL_ROW} text-align: right;">${formatCurrency(invoice.total_due)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

/** The email body sent with every invoice. The very first invoice a
 * family ever gets through this system (see hasPriorInvoiceForBillPayer)
 * includes the full "how to pay" explanation Ethan writes out for new
 * families by hand — bank details, what to use as a reference, what to do
 * if paying is tricky, casual-day rates, and the fees-support note. Every
 * invoice after that just repeats the essentials — amount, due date, how
 * to pay, who to contact — since the family's already had the full
 * explanation once. */
export function renderInvoiceEmail(invoice: Invoice, opts: { isFirstInvoice: boolean }): string {
  const greetingName = firstName(invoice.bill_payer_name);
  const reference = paymentReferenceSuggestion(invoice);

  const intro = opts.isFirstInvoice
    ? `<p>Kia ora ${escapeHtml(greetingName)},</p>
       <p>Hope you and your whānau are well! Please find below your weekly invoice.</p>`
    : `<p>Kia ora ${escapeHtml(greetingName)},</p>
       <p>Please find below your invoice for the week starting ${formatShortDate(invoice.week_start_date)}.</p>`;

  const paymentBlock = opts.isFirstInvoice
    ? `
      <p style="${SUBHEAD}">How to pay</p>
      <ul style="${SECTION}">
        <li>Account Name: ${escapeHtml(BANK_ACCOUNT_NAME)}</li>
        <li>Account: ${escapeHtml(BANK_ACCOUNT_NUMBER)}</li>
        <li>Due: within 7 days of this invoice</li>
        <li>Reference: ${escapeHtml(reference)}</li>
      </ul>
      <p style="${SECTION}">
        <strong>Automatic payments (APs):</strong> If you've set one up (weekly/fortnightly), please flick us a
        quick text or reply so we can note it.
      </p>

      <p style="${SUBHEAD}">If paying is tricky right now</p>
      <p style="${SECTION}">
        No stress, please contact us before the due date and we'll arrange a simple, confidential plan that works
        for you.
      </p>

      <p style="${SUBHEAD}">Casual &amp; permanent days</p>
      <ul style="${SECTION}">
        <li>Casual sessions outside your current enrolment are $10 per hour.</li>
        <li>Want permanent days? Please let us know in advance and we'll check our session times and confirm
          availability.</li>
      </ul>

      <p style="${SUBHEAD}">Spotted something odd?</p>
      <p style="${SECTION}">
        If the amount looks off, you think you've already paid, or anything doesn't feel right, please contact us.
        No dramas, nine times out of ten it's our end being a bit picky and not matching your payment. We'll sort
        it quick-smart.
      </p>

      <p style="${SUBHEAD}">Help with fees</p>
      <p style="${SECTION}">
        You may be eligible for support (e.g., WINZ Childcare Subsidy, OSCAR Subsidy, or 20 Hours ECE). Reply to
        this email if you'd like links or a quick guide — happy to help.
      </p>
    `
    : `
      <p style="${SECTION}">
        Paying the same way as before — Account: ${escapeHtml(BANK_ACCOUNT_NAME)},
        ${escapeHtml(BANK_ACCOUNT_NUMBER)}, reference ${escapeHtml(reference)}. Due within 7 days of this invoice.
      </p>
    `;

  return `
    <div style="${WRAP}">
      <p style="${HEADING}">Beach Kids</p>
      <p style="${MUTED}">Invoice ${escapeHtml(invoice.invoice_number)}</p>

      ${intro}

      ${lineItemsTable(invoice)}

      <p style="${MUTED}">
        Issued ${formatShortDate(invoice.issued_date)}${invoice.due_date ? ` · Due ${formatShortDate(invoice.due_date)}` : ""}
      </p>

      ${paymentBlock}

      <p style="${SUBHEAD}">Questions?</p>
      <p style="${SECTION}">Call/text Administration ${escapeHtml(ADMIN_PHONE)}, or just reply to this email.</p>

      <p>Ngā mihi nui,<br/>${escapeHtml(BANK_ACCOUNT_NAME)}</p>
      ${opts.isFirstInvoice ? `<p style="${MUTED}">Thank you for supporting local whānau-owned childcare.</p>` : ""}
    </div>
  `;
}

/** The email body sent for a statement — every invoice this family has
 * outstanding (sent but not yet marked paid), added up into one running
 * total. Doesn't include anything still in draft, paid, or voided. */
export function renderStatementEmail(statement: FamilyStatement): string {
  const rows = statement.outstandingInvoices
    .map(
      (inv) => `
      <tr>
        <td style="${TD}">${escapeHtml(inv.invoice_number)}</td>
        <td style="${TD}">${formatShortDate(inv.week_start_date)}</td>
        <td style="${TD} text-align: right;">${formatCurrency(inv.total_due)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="${WRAP}">
      <p style="${HEADING}">Beach Kids</p>
      <p style="${MUTED}">Statement of account</p>

      <p>Hi ${escapeHtml(statement.bill_payer_name)},</p>
      <p>Here's a summary of what's currently outstanding on your account.</p>

      <table style="${TABLE}">
        <thead>
          <tr>
            <th style="${TH}">Invoice</th>
            <th style="${TH}">Week</th>
            <th style="${TH} text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <td style="${TD} ${TOTAL_ROW}" colspan="2">Total currently owing</td>
            <td style="${TD} ${TOTAL_ROW} text-align: right;">${formatCurrency(statement.totalOwing)}</td>
          </tr>
        </tbody>
      </table>

      <p>If you've already paid any of the above, it may not have been reconciled yet — let us know and we'll check.</p>

      <p>Thanks,<br/>Beach Kids</p>
    </div>
  `;
}
