# Theming — light, dark, system

## Behaviour
- Options: **System** (default), **Light**, **Dark** — in the Account menu (X1) and Settings (T14), via the `ThemeSwitcher` component.
- System follows `prefers-color-scheme` live.
- The choice is saved in a cookie (instant, works signed-out) and on `profiles.theme` (follows the user across devices). On sign-in the profile value wins.

## Mechanism
- `<html data-theme="light|dark">` is set by a tiny **inline script in `<head>`** (`src/lib/theme/theme.ts → themeInitScript`) that reads the `cc-theme` cookie before the page paints, so there's no flash. It runs in the browser rather than on the server so pages stay fully pre-rendered (Next.js Cache Components). With `system`, no attribute is set and CSS media queries decide.
- `ThemeSwitcher` writes the cookie and updates the attribute immediately.
- `src/styles/generated/tokens.css` (built by `pnpm tokens`) defines every colour token three ways:
  ```
  :root { …light values… }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { …dark… } }
  :root[data-theme="dark"] { …dark… }
  ```
- `color-scheme` is set per theme so native controls, scrollbars and form fields match.
- `<meta name="theme-color">` has a light and a dark value for the browser/PWA chrome.
- The web app manifest can't follow the scheme, so its `theme_color` and `background_color` use the Light `bg`. Android's launch screen is light even in Dark; once the page loads, the per-scheme `theme-color` takes over (decision #79).

## Rules
- Components reference tokens only. A literal colour in a component is a bug.
- Dark mode is not "invert": cards lose `shadow-card` and gain a `line` border (from the system).
- **AI diagrams** are drawn with `currentColor` plus the accent, so they adapt to both themes; the sanitiser strips fixed white/black backgrounds.
- Logos switch between the `*.svg` and `*-dark.svg` files.
- Every screen is tested in both themes (Playwright screenshots + axe contrast).
