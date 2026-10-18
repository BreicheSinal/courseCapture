import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils/cn";
import { isComplete, isOverdue } from "@/lib/student/rules";
import type { StudentCourse, StudentModuleState } from "@/types/supabase";
import { PageHeader } from "../teacher/PageHeader";
import { CourseStatus, useDateOnly } from "./shared";

/** Canvas S8 · Course overview: progress, the modules, and Resume. */
export function CourseOverview({
  course,
  modules,
  resume,
  today,
}: {
  course: StudentCourse;
  modules: StudentModuleState[];
  resume: number | null;
  today: string;
}) {
  const t = useTranslations("student.overview");
  const format = useFormatter();
  const date = useDateOnly();
  const base = `/student/courses/${course.course_id}`;
  const complete = isComplete(course);
  const quiz = course.quiz_answered
    ? format.number(course.quiz_correct / course.quiz_answered, { style: "percent" })
    : null;
  const meta = [
    t("modules", { count: course.module_count }),
    course.due_date
      ? isOverdue(course, today)
        ? t("wasDue", { date: date(course.due_date) })
        : t("due", { date: date(course.due_date) })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title={<bdi lang={course.content_locale}>{course.title}</bdi>}
        subtitle={meta}
        size="large"
        back={{ href: `/student/classes/${course.class_id}`, label: t("back", { name: course.class_name }) }}
        actions={<CourseStatus course={course} today={today} />}
      />

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="callout font-semibold">{t("yourProgress")}</span>
          <span className="subhead text-ink-muted tabular-nums">
            {t("doneOf", { done: course.modules_done, total: course.module_count })}
            {quiz && ` · ${t("quiz", { pct: quiz })}`}
          </span>
        </div>
        <Progress value={course.modules_done} max={course.module_count} label={t("progressLabel")} />
        <span className="footnote text-ink-muted">
          {complete ? t("allDone") : t("finishToGet", { count: course.module_count })}
        </span>
        {modules.length > 0 && (
          <Link
            href={complete ? `${base}/finish` : `${base}/modules/${resume ?? 1}`}
            className={buttonClasses({ variant: "primary", block: true })}
          >
            {complete ? t("seeCertificate") : course.modules_done > 0 ? t("resume", { n: resume ?? 1 }) : t("start")}
          </Link>
        )}
      </Card>

      {modules.length === 0 ? (
        <EmptyState icon="courses" title={t("noModules")} />
      ) : (
        <ol aria-label={t("modulesLabel")} className="cc-entities m-0 list-none p-0">
          {modules.map((m) => {
            const current = !complete && m.position === resume;
            const status = m.done
              ? m.quiz_correct === null
                ? t("complete")
                : m.quiz_correct
                  ? t("completeQuizRight")
                  : t("completeQuizMissed")
              : current
                ? t("youreHere")
                : t("notStarted");
            return (
              <li key={m.module_id} className="border-b border-line last:border-b-0">
                <Link
                  href={`${base}/modules/${m.position}`}
                  aria-current={current ? "step" : undefined}
                  className="cc-entity min-h-16 border-0"
                >
                  <span className="cc-entity__lead">
                    {m.done ? (
                      <Icon name="checkCircle" width={22} height={22} className="text-success" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block size-5 rounded-pill border-2",
                          current ? "border-accent" : "border-line-strong",
                        )}
                      />
                    )}
                  </span>
                  <span className="cc-entity__body">
                    <span className="cc-entity__title">
                      {m.position} · <bdi lang={course.content_locale}>{m.heading}</bdi>
                    </span>
                    <span className={cn("cc-entity__desc", current && "font-semibold text-accent-text")}>{status}</span>
                  </span>
                  <span className="cc-entity__trail text-ink-muted">
                    <Icon name="chevronForward" width={18} height={18} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
