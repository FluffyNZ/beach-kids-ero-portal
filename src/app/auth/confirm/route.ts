import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

// Where an emailed Supabase link lands (password reset, and any other email
// link pointed here). It swaps the one-time link for a signed-in session,
// then sends the person on to `next` (only ever a path on this site).
//
// Two link styles are accepted, because Supabase can send either:
//   - "?code=…"                   — the default reset email (PKCE). Works when
//                                    the link is opened in the same browser
//                                    the reset was requested from.
//   - "?token_hash=…&type=recovery" — if the Supabase "Reset password" email
//                                    template is switched to this format, the
//                                    link also works on a different device.
// Anything else, or an expired/used link, goes back to /forgot-password with
// a clear message rather than an error page.
const ALLOWED_TYPES: EmailOtpType[] = ["recovery", "invite", "magiclink", "email", "signup", "email_change"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"), "/reset-password");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = createClient();
  let ok = false;

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const destination = ok ? next : "/forgot-password?error=link";
  return NextResponse.redirect(new URL(destination, url.origin));
}
