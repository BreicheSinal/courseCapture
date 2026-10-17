import type { Locale } from "@/i18n/locales";
import type messages from "@/messages/en.json";

// Makes message keys and locales type-checked: a missing key is a TypeScript error.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
