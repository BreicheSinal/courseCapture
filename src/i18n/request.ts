import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // Route handlers and server actions pass `locale` explicitly;
  // pages and layouts read it from the [locale] root segment.
  if (!locale) {
    const value = await rootParams.locale();
    if (!hasLocale(routing.locales, value)) notFound();
    locale = value;
  }

  return {
    locale,
    // Same zone on server and client so dates never differ between renders.
    // Due dates are calendar dates; timestamps show in UTC until profiles store a zone.
    timeZone: "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
