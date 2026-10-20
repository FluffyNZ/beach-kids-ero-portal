import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/marketing/token-crypto";
import { exchangeCodeForShortLivedToken, exchangeForLongLivedToken, fetchPagesForUser, MetaGraphError } from "@/lib/marketing/meta-graph";

export const dynamic = "force-dynamic";

function connectionsUrl(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/marketing/connections", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

// Where Meta redirects back to after Ethan approves (or declines) the
// Facebook Login for Business dialog. Exchanges the auth code for a
// long-lived user token, lists every Page that user administers (each
// with its own Page Access Token and, if linked, Instagram Business
// account — see fetchPagesForUser), and stores them in a short-lived
// marketing_oauth_pending row for the Connections page's "pick a Page"
// step, since a login can return more than one Page.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const metaError = url.searchParams.get("error_message") || url.searchParams.get("error");
  const cookieState = request.cookies.get("meta_oauth_state")?.value;

  if (metaError) {
    return NextResponse.redirect(connectionsUrl(request, { error: metaError }));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(connectionsUrl(request, { error: "The connection attempt could not be verified — please try again." }));
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const pages = await fetchPagesForUser(longLived.access_token);

    if (pages.length === 0) {
      return NextResponse.redirect(
        connectionsUrl(request, { error: "No Facebook Pages were found for this login — Ethan needs to be an admin on the Beach Kids Facebook Page." })
      );
    }

    const pendingState = randomUUID();
    const supabase = createClient();
    const { error: insertError } = await supabase.from("marketing_oauth_pending").insert({
      state: pendingState,
      user_long_lived_token_encrypted: encryptToken(longLived.access_token),
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        access_token_encrypted: encryptToken(p.access_token),
        instagram_business_account_id: p.instagram_business_account_id,
        instagram_business_account_name: p.instagram_business_account_name,
      })),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    } as any);
    if (insertError) throw new Error(insertError.message);

    const res = NextResponse.redirect(connectionsUrl(request, { pending: pendingState }));
    res.cookies.delete("meta_oauth_state");
    return res;
  } catch (err) {
    const message = err instanceof MetaGraphError || err instanceof Error ? err.message : "Something went wrong connecting to Meta.";
    return NextResponse.redirect(connectionsUrl(request, { error: message }));
  }
}
