import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { buttonClasses } from "@/components/ui/Button";
import { AccountAction } from "@/components/features/marketing/AccountAction";
import { MotionShot } from "@/components/features/marketing/MotionShot";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("marketing.meta")]);
  const meta = publicMetadata(locale as Locale, "", t("title"), t("description"));
  return { ...meta, title: { absolute: t("title") } };
}

/**
 * `/` — the public marketing page (#58). Minimal on purpose: what it does, how,
 * what students get, three facts, one call to action. Two recordings of the
 * real app (`pnpm media`). Static; only the account button streams in.
 */
export default function Page() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Students />
      <Facts />
      <CallToAction />
    </>
  );
}

const wrap = "mx-auto w-full max-w-5xl px-4 md:px-8";

function Hero() {
  const t = useTranslations("marketing");
  return (
    <section aria-labelledby="hero-title" className={`${wrap} grid items-center gap-12 pt-6 pb-12 md:grid-cols-[1fr_auto] md:pt-8`}>
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
      <div className="mx-auto w-full max-w-64 md:w-64">
        <MotionShot name="create" alt={t("alt.create")} posterAlt={t("alt.createPoster")} />
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("marketing.how");
  const steps = ["upload", "check", "assign"] as const;
  return (
    <section aria-labelledby="how-title" className={`${wrap} py-12`}>
      <h2 id="how-title" className="cc-mk-section-title">
        {t("title")}
      </h2>
      <ol className="mt-8 grid gap-8 md:grid-cols-3">
        {steps.map((k, i) => (
          <li key={k} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="cc-mk-step" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="headline">{t(`${k}.title`)}</h3>
            </div>
            <p className="text-ink-muted">{t(`${k}.text`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Students() {
  const t = useTranslations("marketing");
  const items = ["join", "learn", "certificate", "offline"] as const;
  return (
    <section aria-labelledby="students-title" className={`${wrap} grid items-center gap-12 py-12 md:grid-cols-[auto_1fr]`}>
      <div className="mx-auto w-full max-w-64 max-md:order-last md:w-64">
        <MotionShot name="learn" alt={t("alt.learn")} posterAlt={t("alt.learnPoster")} />
      </div>
      <div className="flex flex-col gap-6">
        <h2 id="students-title" className="cc-mk-section-title">
          {t("students.title")}
        </h2>
        <ul className="cc-mk-list body flex flex-col gap-4">
          {items.map((k) => (
            <li key={k}>{t(`students.items.${k}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Facts() {
  const t = useTranslations("marketing.facts");
  const items = ["languages", "files", "students"] as const;
  return (
    <section aria-label={t("label")} className={`${wrap} py-12`}>
      <ul className="grid gap-8 md:grid-cols-3">
        {items.map((k) => (
          <li key={k} className="flex flex-col gap-2 border-t border-line pt-4">
            <h2 className="headline">{t(`${k}.title`)}</h2>
            <p className="text-ink-muted">{t(`${k}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CallToAction() {
  const t = useTranslations("marketing");
  return (
    <section aria-labelledby="cta-title" className={`${wrap} py-12`}>
      <div className="flex flex-col items-start gap-4 rounded-lg bg-accent-soft p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="cta-title" className="title">
            {t("cta.title")}
          </h2>
          <p>{t("cta.text")}</p>
        </div>
        <Link href="/contact" className={buttonClasses({ variant: "secondary", size: "lg" })}>
          {t("talkToUs")}
        </Link>
      </div>
    </section>
  );
}
