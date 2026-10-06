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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The email body sent when an invoice is sent — one invoice, one week,
 * exactly the numbers that were frozen in when it was drafted. */
export function renderInvoiceEmail(invoice: Invoice): string {
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
    <div style="${WRAP}">
      <p style="${HEADING}">Beach Kids</p>
      <p style="${MUTED}">Invoice ${escapeHtml(invoice.invoice_number)}</p>

      <p>Hi ${escapeHtml(invoice.bill_payer_name)},</p>
      <p>Here's your invoice for the week starting ${formatShortDate(invoice.week_start_date)}.</p>

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

      <p style="${MUTED}">
        Issued ${formatShortDate(invoice.issued_date)}${invoice.due_date ? ` · Due ${formatShortDate(invoice.due_date)}` : ""}
      </p>

      <p>Thanks,<br/>Beach Kids</p>
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
