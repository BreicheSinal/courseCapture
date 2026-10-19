import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { ContactForm } from "@/components/features/marketing/ContactForm";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("contact")]);
  return publicMetadata(locale as Locale, "/contact", t("title"), t("description"));
}

/** /contact (#59): "Talk to us". The message is emailed, not stored. */
export default function Page() {
  const t = useTranslations("contact");
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-6 pb-8 md:grid-cols-[2fr_3fr] md:gap-12 md:px-8 md:pt-8">
      <div className="flex flex-col gap-4">
        <h1 className="cc-mk-display">{t("title")}</h1>
        <p className="cc-mk-lead">{t("lead")}</p>
      </div>
      <ContactForm />
    </div>
  );
}
