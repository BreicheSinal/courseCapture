# Theming — light, dark, system

## Behaviour
- Options: **System** (default), **Light**, **Dark** — in the Account menu (X1) and Settings (T14), via the `ThemeSwitcher` component.
- System follows `prefers-color-scheme` live.
- The choice is saved in a cookie (instant, works signed-out) and on `profiles.theme` (follows the user across devices). On sign-in the profile value wins.

## Mechanism
- `<html data-theme="light|dark">` is set **on the server** from the cookie, so there's no flash on first paint. With `system`, no attribute is set and CSS media queries decide.
- `tokens.css` defines every colour token three ways:
  ```
  :root { …light values… }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { …dark… } }
  :root[data-theme="dark"] { …dark… }
  ```
- `color-scheme` is set per theme so native controls, scrollbars and form fields match.
- `<meta name="theme-color">` has a light and a dark value for the browser/PWA chrome.

## Rules
- Components reference tokens only. A literal colour in a component is a bug.
- Dark mode is not "invert": cards lose `shadow-card` and gain a `line` border (from the system).
- **AI diagrams** are drawn with `currentColor` plus the accent, so they adapt to both themes; the sanitiser strips fixed white/black backgrounds.
- Logos switch between the `*.svg` and `*-dark.svg` files.
- Every screen is tested in both themes (Playwright screenshots + axe contrast).
