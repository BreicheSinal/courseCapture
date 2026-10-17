/** Interface languages. Course content languages are separate (see docs/i18n.md). */
export const locales = ["en", "ar", "fr", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const rtlLocales: ReadonlySet<Locale> = new Set(["ar"]);

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}

/** Each language's name in its own language, for the language picker. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  es: "Español",
};
