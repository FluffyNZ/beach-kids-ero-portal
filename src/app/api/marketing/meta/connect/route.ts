import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { buildMetaLoginUrl, MetaGraphError } from "@/lib/marketing/meta-graph";

export const dynamic = "force-dynamic";

// Starts the Meta OAuth flow ("Connect accounts" on the Marketing >
// Connections page). Behind the normal login wall like every other route —
// this is a user-initiated click, not a machine call, so Ethan (or any
// logged-in staff member) is already authenticated when this runs. The
// state value is round-tripped via an httpOnly cookie rather than a DB
// row — simple CSRF protection for this one short redirect hop; the
// callback route is what creates the real marketing_oauth_pending row once
// Meta has actually returned tokens.
export async function GET() {
  try {
    const state = randomUUID();
    const loginUrl = buildMetaLoginUrl(state);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    const message = err instanceof MetaGraphError ? err.message : "Could not start the Meta connection — check the app's Meta configuration.";
    const redirectUrl = new URL("/marketing/connections", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    redirectUrl.searchParams.set("error", message);
    return NextResponse.redirect(redirectUrl);
  }
}
