import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getXeroBankAccounts, refreshXeroTokens } from "@/lib/xero/client";
import type { XeroBankAccountOption, XeroConnectionStatus } from "@/lib/types";

export async function getXeroConnectionStatus(): Promise<XeroConnectionStatus> {
  const supabase = createClient();
  const { data } = await supabase.from("xero_connection").select("*").eq("id", true).maybeSingle();
  return {
    connected: !!data?.access_token,
    tenantName: data?.tenant_name ?? null,
    bankAccountId: data?.bank_account_id ?? null,
    bankAccountName: data?.bank_account_name ?? null,
    connectedAt: data?.connected_at ?? null,
  };
}

/** Returns a currently-valid access token + tenant id for the connected
 * Xero org, refreshing and persisting a new token first if the stored one
 * is expired or about to expire. Returns null if nothing's connected.
 * Xero rotates refresh tokens on every use, so the new one is always
 * saved back — the old one stops working the moment this runs. */
export async function ensureValidXeroAccessToken(): Promise<{ accessToken: string; tenantId: string } | null> {
  const supabase = createClient();
  const { data } = await supabase.from("xero_connection").select("*").eq("id", true).maybeSingle();
  if (!data?.access_token || !data?.tenant_id) return null;

  const expiresAtMs = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  const expiringSoon = expiresAtMs - Date.now() < 2 * 60 * 1000;

  if (!expiringSoon) {
    return { accessToken: data.access_token, tenantId: data.tenant_id };
  }

  if (!data.refresh_token) return null;

  const refreshed = await refreshXeroTokens(data.refresh_token);
  const { error } = await (supabase.from("xero_connection") as any)
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      token_expires_at: refreshed.expiresAt,
    })
    .eq("id", true);
  if (error) throw new Error(`Refreshed the Xero connection but couldn't save it: ${error.message}`);

  return { accessToken: refreshed.accessToken, tenantId: data.tenant_id };
}

/** The connected org's bank accounts, for the "which account is your
 * parent fees account?" picker — refreshes the token first if needed. */
export async function listXeroBankAccountOptions(): Promise<XeroBankAccountOption[]> {
  const tokenInfo = await ensureValidXeroAccessToken();
  if (!tokenInfo) throw new Error("Xero isn't connected.");
  return getXeroBankAccounts(tokenInfo.accessToken, tokenInfo.tenantId);
}
