"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { status: "idle" | "sent" | "error"; message: string | null };

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The site's own address, for the link in the reset email. Prefers the
 * configured NEXT_PUBLIC_SITE_URL (so links always point at the real
 * domain), falling back to the address this request came in on. */
function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Asks Supabase to email a password-reset link.
 *
 * Privacy: the reply is identical whether or not the address has an
 * account, so this page can't be used to find out who has one. Supabase
 * itself also doesn't reveal it. The only different replies are for a
 * badly-typed address, or when Supabase says to slow down. */
export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_FORMAT.test(email)) {
    return { status: "error", message: "Enter the email address you use to sign in." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    if (error.status === 429) {
      return {
        status: "error",
        message: "Too many reset requests in a short time. Please wait a few minutes, then try again.",
      };
    }
    console.error("Password reset email failed", error.message);
    return {
      status: "error",
      message: "We couldn't send the reset email just now. Please try again shortly, or contact your centre administrator.",
    };
  }

  return {
    status: "sent",
    message: `If ${email} has an Earlydesk account, we've sent it a link to choose a new password. The link expires after a short time — check your junk folder if it hasn't arrived in a few minutes.`,
  };
}
