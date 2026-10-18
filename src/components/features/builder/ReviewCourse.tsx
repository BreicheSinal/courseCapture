import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Steps } from "@/components/ui/Steps";
import { localeNames, type Locale } from "@/i18n/locales";
import type { BuilderCourse, BuilderModule } from "@/lib/courses/queries";
import { FALLBACK_NOTE } from "@/lib/generation/fallback";
import { CourseMenu, MoveButtons, RenameCourse } from "./ReviewControls";

/**
 * T3 · Review course: every module with what it contains and whether it has
 * been checked, in order. Teachers reorder here and open a module to edit it
 * (T4); "Assign to a class" opens T5.
 */
export function ReviewCourse({
  course,
  modules,
  assignedCount,
  notice,
}: {
  course: BuilderCourse;
  modules: BuilderModule[];
  assignedCount: number;
  notice: "generated" | "assigned" | "checked" | "moduleDeleted" | null;
}) {
  const t = useTranslations("teacher.review");
  const tn = useTranslations("teacher.newCourse");
  const ts = useTranslations("teacher.settings");
  const base = `/teacher/courses/${course.id}`;
  const checked = modules.filter((m) => m.checked_at).length;
  const flagged = modules.filter((m) => !m.checked_at && m.review_note).length;
  const fallback = (course.job?.fallback_chunks ?? 0) > 0;
  const lang = localeNames[course.content_locale as Locale] ?? course.content_locale;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow text-ink-muted">
            {t("meta", { language: lang, level: ts(`level_${course.level}`), count: modules.length })}
          </span>
          <RenameCourse courseId={course.id} title={course.title} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/courses/${course.id}/export`} download className={buttonClasses({ variant: "secondary" })}>
            <Icon name="download" />
            {t("export")}
          </a>
          <CourseMenu courseId={course.id} previewHref={`${base}/preview`} />
          <Link href={`${base}/assign`} className={buttonClasses({ variant: "primary" })}>
            {t("assign")}
          </Link>
        </div>
      </div>

      <Steps label={tn("steps.label")} steps={[tn("steps.source"), tn("steps.generate"), tn("steps.review")]} current={2} />

      {notice && (
        <p role="status" className="subhead flex items-center gap-1 font-semibold text-success">
          <Icon name="check" width={16} height={16} />
          {notice === "assigned" ? t("notice_assigned", { count: assignedCount }) : t(`notice_${notice}`)}
        </p>
      )}

      {fallback && (
        <div className="cc-notice cc-notice--warning subhead" role="note">
          <Icon name="alert" />
          <p>{t("fallbackNote")}</p>
        </div>
      )}

      <div className="cc-notice subhead">
        <Icon name="info" />
        <p>
          {t("checkNote")} {flagged > 0 && <strong>{t("flagged", { count: flagged })}</strong>} {t("checkedCount", { checked, total: modules.length })}
        </p>
      </div>

      <Card as="section" aria-labelledby="modules-title" className="flex flex-col p-0">
        <h2 id="modules-title" className="sr-only">
          {t("modulesTitle")}
        </h2>
        <ol className="m-0 list-none p-0">
          {modules.map((m, i) => {
            const contents = [
              t("keyPoints", { count: m.key_points.length }),
              t("cards", { count: m.flashcards.length }),
              m.quiz ? t("question") : t("noQuestion"),
              m.visual_svg ? t("diagram") : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={m.id} className="flex items-center gap-2 border-b border-line px-4 py-2 last:border-b-0">
                <Link
                  href={`${base}/modules/${m.position}/edit`}
                  className="flex min-h-control min-w-0 flex-1 items-center gap-3 text-ink no-underline"
                >
                  <span className="subhead w-6 flex-none text-ink-muted tabular-nums">{m.position}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="callout truncate font-semibold" dir="auto">
                      {m.heading}
                    </span>
                    <span className="footnote text-ink-muted">{contents}</span>
                  </span>
                  <ReviewState module={m} />
                </Link>
                <MoveButtons moduleId={m.id} heading={m.heading} first={i === 0} last={i === modules.length - 1} />
              </li>
            );
          })}
        </ol>
      </Card>

      <p className="footnote text-center text-ink-muted">{t("checkedCount", { checked, total: modules.length })}</p>
    </div>
  );
}

function ReviewState({ module: m }: { module: BuilderModule }) {
  const t = useTranslations("teacher.review");
  if (m.checked_at)
    return (
      <span className="footnote flex flex-none items-center gap-1 font-semibold text-success">
        <Icon name="check" width={14} height={14} />
        {t("state_checked")}
      </span>
    );
  if (m.review_note)
    return (
      <span className="footnote flex max-w-[14rem] flex-none items-center gap-1 font-semibold text-warning">
        <Icon name="alert" width={14} height={14} className="flex-none" />
        <span className="truncate" title={m.review_note === FALLBACK_NOTE ? t("fallbackModule") : m.review_note}>
          {m.review_note === FALLBACK_NOTE ? t("state_fallback") : t("state_check")}
        </span>
      </span>
    );
  return <span className="footnote flex-none text-ink-muted">{t("state_notReviewed")}</span>;
}
