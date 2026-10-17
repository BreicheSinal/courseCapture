import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { assertSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/** Supabase client for Client Components. Acts as the signed-in user; RLS applies. */
export function createClient() {
  assertSupabaseConfigured();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
