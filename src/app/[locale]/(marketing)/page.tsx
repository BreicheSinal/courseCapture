import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDirection, localeNames, locales, type Locale } from "@/i18n/locales";
import { buttonClasses } from "@/components/ui/Button";
import { AccountAction } from "@/components/features/marketing/AccountAction";
import { MotionShot } from "@/components/features/marketing/MotionShot";
import { Shot, type ShotName } from "@/components/features/marketing/Shot";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("marketing.meta")]);
  const meta = publicMetadata(locale as Locale, "", t("title"), t("description"));
  return { ...meta, title: { absolute: t("title") } };
}

/**
 * `/` — the public marketing page (#58). Static: no data reads; only the
 * header and hero buttons stream in for signed-in people (AccountAction).
 * The screens are real captures of the app (`pnpm media`).
 */
export default function Page() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Audiences />
      <Languages />
      <Privacy />
      <Faq />
    </>
  );
}

const wrap = "mx-auto w-full max-w-6xl px-4 md:px-8";

function Hero() {
  const t = useTranslations("marketing");
  return (
    <section aria-labelledby="hero-title" className={`${wrap} grid items-center gap-8 pt-6 pb-12 md:grid-cols-[1fr_auto] md:gap-12 md:pt-8`}>
      <div className="flex flex-col gap-6">
        <h1 id="hero-title" className="cc-mk-display">
          {t("hero.title")}
        </h1>
        <p className="cc-mk-lead">{t("hero.lead")}</p>
        <div className="flex flex-wrap gap-3">
          <AccountAction variant="primary" size="lg" />
          <Link href="/contact" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            {t("talkToUs")}
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-72 md:w-72">
        <MotionShot name="create" alt={t("alt.create")} posterAlt={t("alt.createPoster")} />
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("marketing");
  const steps: { key: "upload" | "check" | "assign"; shot: ShotName }[] = [
    { key: "upload", shot: "teacher-new" },
    { key: "check", shot: "teacher-review" },
    { key: "assign", shot: "teacher-assign" },
  ];
  return (
    <section aria-labelledby="how-title" className="bg-surface py-12">
      <div className={wrap}>
        <h2 id="how-title" className="cc-mk-section-title">
          {t("how.title")}
        </h2>
        <ol className="mt-8 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.key} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="cc-mk-step" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="headline">{t(`how.${s.key}.title`)}</h3>
              </div>
              <p className="text-ink-muted">{t(`how.${s.key}.text`)}</p>
              <div className="cc-mk-phone mx-auto mt-auto w-full max-w-64">
                <Shot name={s.shot} alt={t(`alt.${s.key}`)} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Audiences() {
  const t = useTranslations("marketing");
  const teacher = ["join", "roster", "announce", "export"] as const;
  const student = ["join", "learn", "certificate", "offline"] as const;
  return (
    <>
      <section aria-labelledby="teachers-title" className={`${wrap} grid items-center gap-8 py-12 md:grid-cols-[2fr_3fr] md:gap-12`}>
        <div className="flex flex-col gap-6">
          <h2 id="teachers-title" className="cc-mk-section-title">
            {t("teachers.title")}
          </h2>
          <ul className="cc-mk-list flex flex-col gap-4 body">
            {teacher.map((k) => (
              <li key={k}>{t(`teachers.items.${k}`)}</li>
            ))}
          </ul>
        </div>
        <div className="cc-mk-window">
          <Shot name="teacher-roster-desktop" alt={t("alt.roster")} />
        </div>
      </section>
      <section aria-labelledby="students-title" className={`${wrap} grid items-center gap-8 py-12 md:grid-cols-[auto_1fr] md:gap-12`}>
        <div className="mx-auto w-full max-w-72 md:order-first md:w-72">
          <MotionShot name="learn" alt={t("alt.learn")} posterAlt={t("alt.learnPoster")} />
        </div>
        <div className="flex flex-col gap-6 max-md:order-first">
          <h2 id="students-title" className="cc-mk-section-title">
            {t("students.title")}
          </h2>
          <ul className="cc-mk-list flex flex-col gap-4 body">
            {student.map((k) => (
              <li key={k}>{t(`students.items.${k}`)}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Languages() {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const names = new Intl.DisplayNames([locale], { type: "language" });
  return (
    <section aria-labelledby="languages-title" className="bg-surface py-12">
      <div className={wrap}>
        <div className="flex max-w-3xl flex-col gap-4">
          <h2 id="languages-title" className="cc-mk-section-title">
            {t("languages.title")}
          </h2>
          <p className="cc-mk-lead">{t("languages.text")}</p>
        </div>
        {/* Scrolls sideways on phones; focusable so keyboard users can scroll it too. */}
        <div className="cc-mk-langs mt-8" role="region" aria-label={t("languages.region")} tabIndex={0}>
          {locales.map((l) => {
            const name = names.of(l) ?? l;
            return (
              <figure key={l} className="flex flex-col gap-3">
                <div className="cc-mk-phone">
                  <Shot name={`lang-${l}`} alt={t("alt.lang", { language: name })} />
                </div>
                <figcaption className="text-center font-semibold" lang={l} dir={getDirection(l)}>
                  {localeNames[l]}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const t = useTranslations("marketing.privacy");
  const items = ["files", "students", "checked"] as const;
  return (
    <section aria-labelledby="privacy-title" className={`${wrap} py-12`}>
      <h2 id="privacy-title" className="cc-mk-section-title">
        {t("title")}
      </h2>
      <ul className="mt-8 grid gap-8 md:grid-cols-3">
        {items.map((k) => (
          <li key={k} className="flex flex-col gap-2 border-t border-line pt-4">
            <h3 className="headline">{t(`${k}.title`)}</h3>
            <p className="text-ink-muted">{t(`${k}.text`)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link href="/privacy" className="cc-mk-link font-semibold text-accent-text">
          {t("more")}
        </Link>
      </p>
    </section>
  );
}

function Faq() {
  const t = useTranslations("marketing.faq");
  const items = ["files", "edit", "phones", "accounts", "start"] as const;
  return (
    <section aria-labelledby="faq-title" className={`${wrap} py-12`}>
      <h2 id="faq-title" className="cc-mk-section-title">
        {t("title")}
      </h2>
      <div className="cc-mk-faq mt-6 max-w-3xl divide-y divide-line border-y border-line">
        {items.map((k) => (
          <details key={k}>
            <summary>{t(`${k}.q`)}</summary>
            <p className="pb-5 text-ink-muted">{t(`${k}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
