import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { supabaseUrl } from "./env";

/**
 * Service-role client: bypasses RLS. Only for background jobs and server code
 * that has already checked the caller (docs/architecture.md, rule 3). Never
 * import it from a component or pass it user input without that check.
 */
let client: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function isServiceConfigured() {
  return Boolean(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function serviceClient() {
  if (!client) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !key)
      throw new Error("Set SUPABASE_SERVICE_ROLE_KEY (server only) to generate courses (docs/setup-supabase.md).");
    client = createSupabaseClient<Database>(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export const SOURCES_BUCKET = "sources";
