import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries its language: /en/…, /ar/…
  localePrefix: "always",
  localeCookie: { name: "cc-locale", maxAge: 60 * 60 * 24 * 365 },
});
