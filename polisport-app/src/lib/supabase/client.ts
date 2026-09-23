import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pentru Browser (componente client-side).
 * Folosit în componente React marcate cu "use client".
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
