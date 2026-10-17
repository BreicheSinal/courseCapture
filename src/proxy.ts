import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Runs before every page request.
 * Stage 1: picks the interface language (profile → cookie → Accept-Language → en)
 * and adds it to the URL. Auth and role guards are added in stage 2 (docs/auth-and-roles.md).
 */
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
