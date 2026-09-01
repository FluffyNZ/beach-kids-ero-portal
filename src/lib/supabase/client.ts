"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser client — uses the public anon key only. Every query it makes is
// constrained by Row Level Security (see supabase/migrations/0002_rls.sql),
// so it can never read or write data an authenticated Beach Kids manager
// shouldn't see.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
