/**
 * Page-view URLs for Vercel Web Analytics (#39, decision #89).
 *
 * Analytics sees which screens are used, never which class, course or person:
 * - the query string and fragment are dropped (`?class=…`, `?course=…`, `?error=…`);
 * - every id in the path becomes `:id`, so `/en/teacher/classes/3f2a…` is counted
 *   as `/en/teacher/classes/:id`;
 * - the sign-in callback and the dev-only `/design` page aren't counted at all.
 *
 * Kept free of React and Next so it can be unit tested (tests/unit/analytics.test.ts).
 */
const ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24,})$/i;
const SKIP = [/^\/auth(\/|$)/, /^\/[a-z]{2}\/design(\/|$)/];

/** The URL to report for a page view, or `null` to not report it. */
export function redactAnalyticsUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://example.invalid");
  } catch {
    return null;
  }
  const path = parsed.pathname
    .split("/")
    .map((segment) => (ID.test(segment) ? ":id" : segment))
    .join("/");
  if (SKIP.some((re) => re.test(path))) return null;
  // Absolute in, absolute out: the script reports the page's own origin.
  return /^https?:\/\//i.test(url) ? `${parsed.origin}${path}` : path;
}

/** On only where Vercel built the app; local runs, tests and other hosts send nothing. */
export const analyticsEnabled = () => process.env.VERCEL === "1" && process.env.ANALYTICS !== "off";
