"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { localeNames, locales } from "@/i18n/locales";

/** The same page in each interface language, as plain links (crawlable, no script needed). */
export function LanguageLinks({ label }: { label: string }) {
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-x-5">
        {locales.map((l) => (
          <li key={l}>
            <Link
              href={pathname}
              locale={l}
              hrefLang={l}
              lang={l}
              className="cc-mk-link"
              aria-current={l === current ? "page" : undefined}
            >
              {localeNames[l]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
