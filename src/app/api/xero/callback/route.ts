import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeXeroCode, getXeroTenant } from "@/lib/xero/client";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "xero_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const xeroError = request.nextUrl.searchParams.get("error");

  const settingsUrl = new URL("/finances/xero", request.url);

  function fail(message: string) {
    const url = new URL(settingsUrl);
    url.searchParams.set("error", message);
    const res = NextResponse.redirect(url);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  if (xeroError) {
    return fail(
      xeroError === "access_denied" ? "Xero connection cancelled." : `Xero returned an error: ${xeroError}`
    );
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("Could not verify the Xero connection request — please try connecting again.");
  }

  try {
    // Must be byte-for-byte the same redirect_uri sent to /authorize, or
    // Xero's token exchange rejects it.
    const redirectUri = new URL("/api/xero/callback", request.url).toString();
    const tokens = await exchangeXeroCode(code, redirectUri);
    const tenant = await getXeroTenant(tokens.accessToken);
    if (!tenant) {
      return fail("Connected, but Xero didn't return an organisation to use. Try again.");
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await (supabase.from("xero_connection") as any)
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        tenant_id: tenant.tenantId,
        tenant_name: tenant.tenantName,
        // A fresh connection means any previously-chosen bank account is
        // no longer guaranteed to exist/apply — make them re-pick it.
        bank_account_id: null,
        bank_account_name: null,
        connected_at: new Date().toISOString(),
        connected_by: user?.id ?? null,
      })
      .eq("id", true);

    if (error) {
      return fail(`Connected to Xero but couldn't save it: ${error.message}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong connecting to Xero.";
    return fail(message);
  }

  const res = NextResponse.redirect(settingsUrl);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
