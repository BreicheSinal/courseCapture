import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/i18n/locales";
import { safeNext } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE } from "@/lib/theme/theme";

/**
 * Where sign-in email links land.
 * Verifies the one-time link (token hash or PKCE code), then sends the person on:
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

  const supabase = await createClient();
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  // Two link styles (docs/auth-and-roles.md):
  // - token_hash: the email template links straight here; works on any device.
  // - code (PKCE): Supabase's default link; only works in the browser that asked.
  let user = null;
  if (tokenHash && (otpType === "email" || otpType === "magiclink" || otpType === "signup")) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (!error) user = data.user;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) user = data.user;
  }
  if (!user) return to("/sign-in?error=linkExpired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, theme")
    .eq("id", user.id)
    .single();

  theme = profile?.theme ?? null;

  // An account without a role (e.g. created outside the app) gets the role
  // picked at sign-in if the name is known; otherwise onboarding asks.
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
