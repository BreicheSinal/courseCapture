"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { applyThemePref, readThemeCookie, themePrefs, writeThemeCookie, type ThemePref } from "@/lib/theme/theme";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "./Icon";

const icons: Record<ThemePref, IconName> = { light: "sun", system: "monitor", dark: "moon" };

// The cookie is the source of truth; components re-read it when it changes.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => readThemeCookie(document.cookie);
const getServerSnapshot = (): ThemePref => "system";

/** Current theme preference and a setter, shared by every switcher on the page. */
export function useThemePreference(): [ThemePref, (next: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = (next: ThemePref) => {
    writeThemeCookie(next);
    applyThemePref(next);
    listeners.forEach((fn) => fn());
  };
  return [pref, set];
}

/**
 * Light / System / Dark radio group (design-system ThemeSwitcher).
 * Arrow keys move and select; only the selected option is in the tab order.
 */
export function ThemeSwitcher({
  size = "md",
  onChange,
}: {
  size?: "md" | "sm";
  /** Called after the person picks a theme (e.g. to save it to their profile). */
  onChange?: (pref: ThemePref) => void;
}) {
  const t = useTranslations("theme");
  const [pref, setPref] = useThemePreference();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function choose(next: ThemePref, focus = false) {
    setPref(next);
    onChange?.(next);
    if (focus) refs.current[themePrefs.indexOf(next)]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = themePrefs.indexOf(pref);
    // In RTL the visual order flips, so ArrowLeft moves forward.
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = i;
    if (e.key === fwd || e.key === "ArrowDown") next = (i + 1) % themePrefs.length;
    else if (e.key === back || e.key === "ArrowUp") next = (i - 1 + themePrefs.length) % themePrefs.length;
    else return;
    e.preventDefault();
    choose(themePrefs[next], true);
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn("cc-theme", size === "sm" && "cc-theme--sm")}
      onKeyDown={onKeyDown}
    >
      {themePrefs.map((p, i) => (
        <button
          key={p}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={pref === p}
          aria-label={t(p)}
          title={t(p)}
          tabIndex={pref === p ? 0 : -1}
          className="cc-theme__opt"
          onClick={() => choose(p)}
        >
          <Icon name={icons[p]} />
        </button>
      ))}
    </div>
  );
}
