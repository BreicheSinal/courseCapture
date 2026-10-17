import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/i18n/locales";
import { safeNext } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE } from "@/lib/theme/theme";

/**
 * Where sign-in email links and Google sign-in land.
 * Exchanges the one-time code for a session, then sends the person on:
 * - wrong role for what they picked at sign-in → /wrong-account (T7c)
 * - otherwise → /{locale}, which routes them to the right home.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const localeParam = url.searchParams.get("locale") ?? "";
  const locale: Locale = (locales as readonly string[]).includes(localeParam) ? (localeParam as Locale) : defaultLocale;
  const roleParam = url.searchParams.get("role");
  const wanted = roleParam === "teacher" || roleParam === "student" ? roleParam : null;
  let theme: string | null = null;
  const to = (path: string) => {
    const res = NextResponse.redirect(new URL(`/${locale}${path}`, url.origin));
    // On sign-in the saved theme wins (docs/theming.md).
    if (theme) res.cookies.set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };

  // Supabase sends errors back as query params (e.g. an expired link).
  if (url.searchParams.get("error")) return to("/sign-in?error=linkExpired");

  const code = url.searchParams.get("code");
  if (!code) return to("/sign-in?error=linkExpired");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return to("/sign-in?error=linkExpired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, theme")
    .eq("id", data.user.id)
    .single();

  theme = profile?.theme ?? null;

  // Google sign-in can't carry the role into the account, so set it now if
  // the name is known; otherwise onboarding asks (pre-selected).
  if (profile && profile.role === null && wanted) {
    if (profile.full_name.trim()) {
      const { error: onboardError } = await supabase.rpc("complete_onboarding", {
        p_full_name: profile.full_name,
        p_role: wanted,
      });
      if (!onboardError) return to("");
    }
    return to(`/onboarding/profile?role=${wanted}`);
  }

  if (profile?.role && wanted && profile.role !== wanted && profile.role !== "admin") {
    return to(`/wrong-account?area=${wanted}`);
  }

  return to(safeNext(url.searchParams.get("next")) ?? "");
}
