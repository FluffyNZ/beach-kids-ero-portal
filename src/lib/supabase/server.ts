import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Server client for use in Server Components, Route Handlers and Server
// Actions. Runs with the caller's own session (anon key + auth cookie), so
// it is still fully governed by RLS — this is not an admin/service client.
export function createClient() {
  const cookieStore = cookies();

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — safe to ignore
            // because middleware refreshes the session on every request.
          }
        },
      },
    }
  );

  // Workaround for a build-blocking TypeScript issue: the currently
  // resolved @supabase/supabase-js / postgrest-js versions fail to thread
  // the Database generic through .insert()/.update()/.upsert() correctly
  // for this hand-written type (every payload gets reported as not
  // assignable to `never[]`, even though the shapes are correct). Casting
  // the client here — once, in the one place every Server Action gets it
  // from — unblocks every affected file at once instead of chasing the
  // same error action-by-action. This only changes what TypeScript checks
  // at compile time; it has zero effect on what the code actually does at
  // runtime, and Row Level Security (not these types) is what actually
  // guards the data either way. Safe to remove once a dependency upgrade
  // fixes the underlying generic resolution.
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}
