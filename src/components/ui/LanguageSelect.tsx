"use client";

import { useId, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./Icon";

/** Interface-language picker (design-system Select inside a Field). Keeps the current page. */
export function LanguageSelect({
  hideLabel,
  className,
  onSelect,
}: {
  hideLabel?: boolean;
  className?: string;
  /** Called with the new language before the page switches (e.g. to save it). */
  onSelect?: (locale: Locale) => void | Promise<void>;
}) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const id = useId();

  return (
    <div className={cn("cc-field", className)}>
      <label htmlFor={id} className={cn("cc-field__label", hideLabel && "sr-only")}>
        {t("label")}
      </label>
      <div className="cc-select">
        <select
          id={id}
          className="cc-input"
          value={locale}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as Locale;
            startTransition(async () => {
              await onSelect?.(next);
              router.replace(pathname, { locale: next });
            });
          }}
        >
          {locales.map((l) => (
            <option key={l} value={l} lang={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="cc-select__chev" />
      </div>
    </div>
  );
}
