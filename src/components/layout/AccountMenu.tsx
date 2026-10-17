"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { useThemePreference } from "@/components/ui/ThemeSwitcher";
import { saveThemePreference, signOut } from "@/lib/auth/actions";
import type { ThemePref } from "@/lib/theme/theme";
import type { UserRole } from "@/types/supabase";

type AccountMenuProps = { name: string; role: UserRole };

/**
 * Canvas X1 · Account menu. The person chip opens a small panel with
 * appearance and sign-out (plus "Join another class" for students).
 * It holds a radio group and a form, so it's a non-modal dialog rather than an ARIA menu.
 * Escape or a click outside closes it and returns focus to the chip.
 */
export function AccountMenu({ name, role }: AccountMenuProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useThemePreference();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onTheme = (next: ThemePref) => {
    setTheme(next);
    void saveThemePreference(next);
  };

  return (
    <div ref={wrap} className="cc-menu">
      <button
        ref={trigger}
        type="button"
        className="cc-chip min-h-control max-w-64 cursor-pointer max-sm:p-1"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("auth.menu.trigger", { name })}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={name} />
        {/* Phones show just the avatar (canvas X1); wider screens add the name and role. */}
        <span className="truncate max-sm:hidden" aria-hidden="true">
          {name}
        </span>
        <Badge variant="info" className="max-sm:hidden">
          {t(`roles.${role}`)}
        </Badge>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("auth.menu.label")}
          className="cc-menu__panel cc-menu__panel--floating cc-menu__panel--end w-75"
        >
          <div className="cc-menu__who">
            {name}
            <span>{t(`roles.${role}`)}</span>
          </div>
          <hr className="cc-menu__divider" />

          {role === "student" && (
            <Link href="/student/join" className="cc-menu__item min-h-control no-underline" onClick={() => setOpen(false)}>
              <Icon name="plus" />
              {t("auth.menu.joinClass")}
            </Link>
          )}

          <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
            <span className="footnote text-ink-muted">{t("auth.menu.appearance")}</span>
            <Segmented
              name="appearance"
              legend={t("auth.menu.appearance")}
              size="lg"
              block
              value={theme}
              onChange={onTheme}
              options={[
                { value: "light", label: t("theme.light") },
                { value: "dark", label: t("theme.dark") },
                { value: "system", label: t("theme.system") },
              ]}
            />
          </div>

          <hr className="cc-menu__divider" />
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="cc-menu__item min-h-control">
              <Icon name="signOut" />
              {t("auth.menu.signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
