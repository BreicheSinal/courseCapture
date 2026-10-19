import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { LegalPage } from "@/components/features/marketing/LegalPage";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("legal.terms")]);
  return publicMetadata(locale as Locale, "/terms", t("title"), t("description"));
}

/** /terms (#59): placeholder wording until the site owner supplies the final text. */
export default function Page() {
  return <LegalPage kind="terms" />;
}
