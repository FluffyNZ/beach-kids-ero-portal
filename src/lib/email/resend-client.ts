import "server-only";
import { Resend } from "resend";

/** Throws a clear, actionable error instead of a cryptic SDK failure when
 * the Resend API key hasn't been set up yet. Sign up at resend.com, verify
 * a sending domain (or use their test address while testing), then add
 * RESEND_API_KEY to your environment variables (Vercel project settings)
 * and redeploy. */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY isn't set yet. Add it to your environment variables (Vercel → Settings → Environment Variables) after creating a Resend account and API key, then redeploy."
    );
  }
  return new Resend(apiKey);
}

/** The "from" address invoice/statement emails are sent with. Defaults to
 * Resend's own test sender (only deliverable to your own Resend account
 * email while testing) — set INVOICE_FROM_EMAIL once you've verified
 * beachkids.co.nz (or whichever domain) in Resend, e.g.
 * "Beach Kids <invoices@beachkids.co.nz>". */
export function getInvoiceFromAddress(): string {
  return process.env.INVOICE_FROM_EMAIL || "Beach Kids <onboarding@resend.dev>";
}
