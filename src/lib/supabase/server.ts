import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/supabase";
import { assertSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Acts as the signed-in user, so RLS applies. Reads cookies, so call it inside a Suspense boundary.
 */
export async function createClient() {
  // Read cookies first: it marks the render as per-request, so builds never try to prerender it.
  const cookieStore = await cookies();
  // supabase-js reads the clock while it sets up (session expiry), which a
  // prefetch prerender may not do. Mark everything after this as request-time.
  await connection();
  assertSupabaseConfigured();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the session instead.
        }
      },
    },
  });
}
