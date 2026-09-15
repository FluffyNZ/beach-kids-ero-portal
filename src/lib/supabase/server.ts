import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client for use in Server Components, Route Handlers and Server
// Actions. Runs with the caller's own session (anon key + auth cookie), so
// it is still fully governed by RLS — this is not an admin/service client.
//
// Deliberately untyped (no <Database> generic): the hand-written
// database.types.ts repeatedly collapsed Supabase's query builder types to
// `never` for perfectly valid queries once a newer @supabase/supabase-js was
// installed on a fresh `npm install` (Vercel doesn't pin an exact version).
// Since every write already goes through `as any` here anyway, the strict
// generic wasn't buying real safety — just unpredictable build breaks that
// couldn't be caught without a real build. Column typos are still caught in
// review and at runtime by Postgres/RLS.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
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
}
