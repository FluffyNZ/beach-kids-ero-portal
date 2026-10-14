import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Small management team (v1: one login) — cheap to load in full and look
 * up by id in memory rather than relying on PostgREST embed/FK-name
 * guessing for every query that needs a display name.
 */
export async function getProfilesMap(): Promise<Map<string, { id: string; full_name: string }>> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("id, full_name");
  const map = new Map<string, { id: string; full_name: string }>();
  (data ?? []).forEach((p) => map.set(p.id, { id: p.id, full_name: p.full_name }));
  return map;
}

export async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  // Fails closed: a logged-in user with no profiles row yet gets the more
  // restrictive "manager" role, not "admin" — see isAuthorisedManagement
  // below, which this fallback feeds into.
  return data ?? { id: user.id, full_name: user.email ?? "Manager", email: user.email ?? "", role: "manager" as const };
}

/**
 * Whether the CURRENT logged-in user is "authorised management" for the
 * purposes of the Staff section's pay/contract/confidential-notes
 * restriction — profiles.role === "admin". "manager" (or no profile row at
 * all) is the restricted tier.
 *
 * IMPORTANT caveat, worth re-reading before relying on this anywhere new:
 * Beach Kids currently runs on ONE SHARED LOGIN for the whole team (see the
 * comments on updateStaffPublishPermission in lib/actions/staff.ts and the
 * same note elsewhere in this app). That means this check is real,
 * server-side enforcement against whatever `profiles` row that one login
 * resolves to — it is NOT yet a per-person permission, because there is
 * only one person's worth of login to check. It stops a logged-out
 * attacker and stops the UI from ever being handed restricted data to
 * render, which is strictly more real than hiding a few form fields in the
 * browser — but it does not yet stop one Beach Kids staff member who knows
 * the shared password from seeing another staff member's pay rate. That
 * only becomes a real per-person restriction once separate logins exist.
 */
export async function isAuthorisedManagement(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}
