import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "./PageHeader";

/** Canvas T8 · First run: no classes yet. */
export function FirstRun() {
  const t = useTranslations("teacher.firstRun");
  const steps = [t("step1"), t("step2"), t("step3")];
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} size="large" />
      <Card as="section" aria-labelledby="first-class" className="flex flex-col items-center gap-3 px-6 pt-12 pb-8 text-center">
        <span aria-hidden="true" className="grid size-16 place-items-center rounded-pill bg-accent-soft text-accent-text">
          <Icon name="classes" width={30} height={30} />
        </span>
        <h2 id="first-class" className="headline">
          {t("emptyTitle")}
        </h2>
        <p className="callout text-ink-muted">{t("emptyText")}</p>
        <Link href="/teacher/classes/new" className={cn(buttonClasses({ variant: "primary", block: true }), "mt-2")}>
          {t("create")}
        </Link>
      </Card>
      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="eyebrow text-ink-muted">
          {t("howTitle")}
        </h2>
        <Card as="div" className="p-0">
          <ol className="m-0 list-none p-0">
            {steps.map((s, i) => (
              <li key={i} className="flex min-h-control items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span aria-hidden="true" className="grid size-7 flex-none place-items-center rounded-pill bg-surface-sunken subhead font-semibold">
                  {i + 1}
                </span>
                <span className="callout">{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}
