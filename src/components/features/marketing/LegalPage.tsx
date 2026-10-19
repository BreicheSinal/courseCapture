import { useFormatter, useTranslations } from "next-intl";

/** When the draft wording last changed. */
const UPDATED = new Date(Date.UTC(2026, 9, 19));
import { Link } from "@/i18n/navigation";

const sections = {
  privacy: ["collect", "files", "ai", "cookies", "rights"],
  terms: ["accounts", "content", "ai", "use", "changes"],
} as const;

/**
 * `/privacy` and `/terms` (#59). The wording is a draft until the site owner
 * supplies the final text; the draft note says so on the page.
 */
export function LegalPage({ kind }: { kind: keyof typeof sections }) {
  const t = useTranslations("legal");
  const format = useFormatter();
  const items =
    kind === "privacy"
      ? sections.privacy.map((k) => ({ k, title: t(`privacy.sections.${k}.title`), text: t(`privacy.sections.${k}.text`) }))
      : sections.terms.map((k) => ({ k, title: t(`terms.sections.${k}.title`), text: t(`terms.sections.${k}.text`) }));
  return (
    <article className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8 md:px-8 md:pt-8">
      <div className="cc-mk-prose flex flex-col gap-4">
        <h1 className="cc-mk-display">{t(`${kind}.title`)}</h1>
        <p className="text-ink-muted">{t("updated", { date: format.dateTime(UPDATED, { year: "numeric", month: "long", timeZone: "UTC" }) })}</p>
        <p className="rounded-md bg-accent-soft px-4 py-3" role="note">
          {t("draft")}
        </p>
        {items.map(({ k, title, text }) => (
          <section key={k} aria-labelledby={`${kind}-${k}`} className="mt-6 flex flex-col gap-2">
            <h2 id={`${kind}-${k}`} className="headline">
              {title}
            </h2>
            <p>{text}</p>
          </section>
        ))}
        <p className="mt-8">
          <Link href="/contact" className="cc-mk-link font-semibold text-accent-text">
            {t("questions")}
          </Link>
        </p>
      </div>
    </article>
  );
}
