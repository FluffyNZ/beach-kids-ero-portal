import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Service-role client. NEVER import this into a Client Component and never
// send its key to the browser — the `server-only` import above makes any
// accidental client-side import fail at build time.
//
// Used sparingly for admin-only operations that must bypass RLS, e.g.
// provisioning additional management logins from Settings in a future
// version. Ordinary reads/writes should go through lib/supabase/server.ts
// so RLS stays the actual access control, not an app-layer convention.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
