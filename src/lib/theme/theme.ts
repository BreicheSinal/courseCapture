/**
 * Theme preference: System (default), Light or Dark. See docs/theming.md.
 *
 * Stored in the `cc-theme` cookie so it works signed out and is read before
 * first paint. In stage 2 it is also saved on the profile.
 */
export const THEME_COOKIE = "cc-theme";
export const themePrefs = ["light", "system", "dark"] as const;
export type ThemePref = (typeof themePrefs)[number];

export function parseThemePref(value: string | undefined | null): ThemePref {
  return value === "light" || value === "dark" ? value : "system";
}

export function readThemeCookie(cookieString: string): ThemePref {
  const match = cookieString.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]+)`));
  return parseThemePref(match?.[1]);
}

/** Applies a preference to <html>: an explicit theme sets data-theme; System removes it. */
export function applyThemePref(pref: ThemePref, root: HTMLElement = document.documentElement) {
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

export function writeThemeCookie(pref: ThemePref) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${pref}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
}

/**
 * Inline script for <head>. Runs before the page paints so an explicit
 * Light or Dark choice never flashes the other theme. Keep it tiny.
 */
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(light|dark)/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}})();`;
