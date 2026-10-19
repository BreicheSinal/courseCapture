import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/supabase";
import { decide, type GuardedPage } from "./routing";

export type Session = {
  userId: string;
  email: string;
  profile: ProfileRow;
};

/**
 * The signed-in person and their profile, read once per request (Data Access Layer).
 * Reads cookies, so call it inside a <Suspense> boundary.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? profile.email, profile };
});

/** Redirects unless the person belongs on `page`. Returns the session (null only on sign-in pages). */
export async function guard(page: GuardedPage): Promise<Session | null> {
  const session = await getSession();
  const target = decide(session?.profile ?? null, page);
  if (target) redirect({ href: target, locale: await getLocale() });
  return session;
}

/** Like guard() for pages that always have a session. */
export async function requireSession(page: Exclude<GuardedPage, "sign-in" | "app">): Promise<Session> {
  const session = await guard(page);
  if (!session) redirect({ href: "/sign-in", locale: await getLocale() });
  return session!;
}
