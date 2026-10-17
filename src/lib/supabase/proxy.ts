import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Refreshes the Supabase session on every request and writes updated cookies
 * onto `response`. Returns whether someone is signed in.
 * Must run in the proxy: Server Components can't write cookies.
 */
export async function refreshSession(request: NextRequest, response: NextResponse): Promise<{ signedIn: boolean }> {
  if (!isSupabaseConfigured) return { signedIn: false };

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims() verifies the JWT and refreshes it when needed. Don't put code
  // between creating the client and this call.
  const { data } = await supabase.auth.getClaims();
  return { signedIn: Boolean(data?.claims?.sub) };
}
