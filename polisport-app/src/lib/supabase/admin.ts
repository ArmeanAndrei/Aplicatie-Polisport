import { createClient as createServerClient } from "@supabase/supabase-js";

/**
 * Client Supabase cu Service Role (acces ADMIN complet).
 * ATENȚIE: Folosit EXCLUSIV în Server Actions / API Routes server-side.
 * NU expuneți acest client în browser — bypasează toate politicile RLS!
 */
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL lipsește din variabilele de mediu.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY lipsește din variabilele de mediu.");
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
