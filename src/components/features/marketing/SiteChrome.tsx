import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { AccountAction } from "./AccountAction";
import { CoverBands } from "./CoverBands";
import { LanguageLinks } from "./LanguageLinks";

/** Top of every marketing page: the Cover bands, then the wordmark and the two ways in. */
export function SiteHeader() {
  const t = useTranslations("marketing");
  return (
    <>
      <CoverBands />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Link href="/" className="cc-wordmark inline-flex min-h-control items-center no-underline" dir="ltr">
          Course<span>Capture</span>
        </Link>
        <nav aria-label={t("nav")} className="flex items-center gap-2">
          <Link href="/contact" className={`${buttonClasses({ variant: "tertiary" })} max-sm:hidden`}>
            {t("talkToUs")}
          </Link>
          <AccountAction variant="secondary" />
        </nav>
      </header>
    </>
  );
}

/** Bottom of every marketing page: legal links and the interface language. */
export function SiteFooter() {
  const t = useTranslations("marketing.footer");
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between md:px-8">
        <div className="flex flex-col gap-1">
          <Link href="/" className="cc-wordmark inline-flex min-h-control items-center no-underline" dir="ltr">
            Course<span>Capture</span>
          </Link>
        </div>
        <nav aria-label={t("label")}>
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <Link href="/privacy" className="cc-mk-link">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="cc-mk-link">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="cc-mk-link">
                {t("contact")}
              </Link>
            </li>
          </ul>
        </nav>
        <LanguageLinks label={t("languages")} />
      </div>
    </footer>
  );
}
