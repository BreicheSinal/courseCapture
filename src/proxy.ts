import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isProtectedPath } from "@/lib/auth/routing";
import { refreshSession } from "@/lib/supabase/proxy";

const intl = createMiddleware(routing);
const localePrefix = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

/**
 * Runs before every page request:
 * 1. Picks the interface language and adds it to the URL (next-intl).
 * 2. Refreshes the Supabase session cookie.
 * 3. Sends signed-out visitors away from protected pages (an optimistic check;
 *    each page re-checks role and status on the server, and RLS is the final guard).
 */
export default async function proxy(request: NextRequest) {
  const response = intl(request);
  // next-intl is redirecting (e.g. adding the locale); let that happen first.
  if (response.headers.has("location")) return response;

  const { signedIn } = await refreshSession(request, response);

  const { pathname } = request.nextUrl;
  const match = pathname.match(localePrefix);
  const rest = match ? pathname.slice(match[0].length) || "/" : pathname;

  if (!signedIn && isProtectedPath(rest)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${match?.[1] ?? routing.defaultLocale}/sign-in`;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed (cleared) auth cookies.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return response;
}

export const config = {
  // Skip API routes, the auth callback, Next internals and files with an extension.
  matcher: "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)",
};
