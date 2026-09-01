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
  return data ?? { id: user.id, full_name: user.email ?? "Manager", email: user.email ?? "" };
}
