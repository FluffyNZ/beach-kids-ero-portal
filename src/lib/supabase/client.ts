"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client — uses the public anon key only. Every query it makes is
// constrained by Row Level Security (see supabase/migrations/0002_rls.sql),
// so it can never read or write data an authenticated Beach Kids manager
// shouldn't see.
//
// Deliberately untyped — see the matching comment in lib/supabase/server.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
