import { NextRequest, NextResponse } from "next/server";
import { getXeroAuthorizeUrl } from "@/lib/xero/client";

// This portal's first API Route Handler — needed because Xero's OAuth2
// redirect is a real GET request from Xero's own servers to this URL, which
// a Server Action can't receive. Protected the same way every other route
// in this app is: middleware.ts already requires a logged-in session for
// everything except /login, this path included.
export const dynamic = "force-dynamic";

const STATE_COOKIE = "xero_oauth_state";

export async function GET(request: NextRequest) {
  // Must exactly match the redirect URI registered on the Xero Developer
  // App, and exactly match what /api/xero/callback rebuilds the same way.
  const redirectUri = new URL("/api/xero/callback", request.url).toString();

  // Handed back unchanged by Xero in the callback — kept in an httpOnly
  // cookie so the callback can confirm the redirect it received really
  // followed from a connect click made in this browser, not a forged
  // callback hit some other way.
  const state = crypto.randomUUID();

  let authorizeUrl: string;
  try {
    authorizeUrl = getXeroAuthorizeUrl(redirectUri, state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start the Xero connection.";
    const errorRedirect = new URL("/finances/xero", request.url);
    errorRedirect.searchParams.set("error", message);
    return NextResponse.redirect(errorRedirect);
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
