import "server-only";
import type { XeroBankAccountOption, XeroReceivedPayment } from "@/lib/types";

// Thin wrapper over Xero's OAuth2 + Accounting API using plain fetch — no
// SDK dependency, since Xero's API is just REST + standard OAuth2 and a
// dependency would need your separate approval (same rule as html-to-image
// and resend) for something a dozen fetch calls already cover.
//
// Read-only: every call here is a GET. Nothing in this file ever writes to
// Xero. Scopes requested are exactly what reading bank transactions and
// bank account names needs, nothing more.

const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const API_BASE = "https://api.xero.com/api.xro/2.0";

// Xero deprecated the old broad "accounting.transactions" (and its
// ".read" sibling) in favour of granular per-resource scopes — every app
// created after March 2026 (this one included) only gets the new ones,
// so the old broad scope name is rejected outright with invalid_scope.
// accounting.banktransactions.read is the correct read-only scope for
// reading bank transactions under the new model.
export const XERO_SCOPES = "offline_access accounting.banktransactions.read accounting.settings.read";

function requireXeroEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "XERO_CLIENT_ID / XERO_CLIENT_SECRET aren't set yet. Create a Xero Developer App at developer.xero.com, then add both as environment variables (Vercel → Settings → Environment Variables) and redeploy."
    );
  }
  return { clientId, clientSecret };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function getXeroAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = requireXeroEnv();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: XERO_SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type XeroTokenResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO timestamp
};

async function parseTokenResponse(res: Response): Promise<XeroTokenResult> {
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    const detail = body?.error_description || body?.error || res.statusText;
    throw new Error(`Xero didn't return a valid token (${res.status}): ${detail}`);
  }
  const expiresInSeconds = typeof body.expires_in === "number" ? body.expires_in : 1800;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

export async function exchangeXeroCode(code: string, redirectUri: string): Promise<XeroTokenResult> {
  const { clientId, clientSecret } = requireXeroEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }).toString(),
  });
  return parseTokenResponse(res);
}

// Xero rotates refresh tokens on every use — the caller MUST persist the
// new refreshToken this returns, the old one stops working immediately.
export async function refreshXeroTokens(refreshToken: string): Promise<XeroTokenResult> {
  const { clientId, clientSecret } = requireXeroEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  });
  return parseTokenResponse(res);
}

export async function getXeroTenant(accessToken: string): Promise<{ tenantId: string; tenantName: string } | null> {
  const res = await fetch(CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Could not read your Xero organisation (${res.status}).`);
  const connections = await res.json();
  const first = Array.isArray(connections) ? connections[0] : null;
  if (!first) return null;
  return { tenantId: first.tenantId, tenantName: first.tenantName ?? "Your Xero organisation" };
}

async function xeroApiGet(path: string, accessToken: string, tenantId: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Xero API request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function getXeroBankAccounts(accessToken: string, tenantId: string): Promise<XeroBankAccountOption[]> {
  const where = encodeURIComponent('Type=="BANK"');
  const data = await xeroApiGet(`/Accounts?where=${where}`, accessToken, tenantId);
  return (data.Accounts ?? []).map((a: any) => ({
    accountId: a.AccountID,
    name: a.Name,
    code: a.Code ?? null,
  }));
}

// Xero's classic API serialises dates as "/Date(1699920000000+0000)/"
// even when Accept: application/json is set — this pulls out the
// millisecond timestamp and returns a plain "YYYY-MM-DD" string.
function parseXeroDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const match = /\/Date\((\d+)/.exec(value);
  if (!match) return value.slice(0, 10);
  return new Date(Number(match[1])).toISOString().slice(0, 10);
}

/** The most recent "money received" transactions in one bank account —
 * bounded to the API's default page (most recent ~100), newest first,
 * rather than filtering by an exact date range server-side, since that
 * covers any realistic weekly/fortnightly sync and keeps the query
 * simple. Only Type=="RECEIVE" (money in) — SPEND transactions (money
 * out, e.g. your own bills) are never considered. */
export async function getXeroReceivedPayments(
  accessToken: string,
  tenantId: string,
  bankAccountId: string
): Promise<XeroReceivedPayment[]> {
  const where = encodeURIComponent(`Type=="RECEIVE" && BankAccount.AccountID=Guid("${bankAccountId}")`);
  const data = await xeroApiGet(`/BankTransactions?where=${where}&order=Date DESC`, accessToken, tenantId);
  return (data.BankTransactions ?? []).map((t: any) => ({
    bankTransactionId: t.BankTransactionID,
    date: parseXeroDate(t.Date),
    amount: typeof t.Total === "number" ? t.Total : Number(t.Total ?? 0),
    reference: t.Reference || null,
    contactName: t.Contact?.Name || null,
  }));
}
