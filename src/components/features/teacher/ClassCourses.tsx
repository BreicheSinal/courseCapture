import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import type { ClassCourseStat } from "@/types/supabase";
import { isolate } from "./rich";

/** T6 · Courses tab: each assigned course with class-wide progress, plus class settings at the end. */
export function ClassCourses({
  classId,
  className,
  courses,
  studentCount,
  assigned = null,
}: {
  classId: string;
  className: string;
  courses: ClassCourseStat[];
  studentCount: number;
  /** Title of a course just assigned here (T5), for the confirmation line. */
  assigned?: string | null;
}) {
  const t = useTranslations("teacher.classPage");
  const format = useFormatter();
  const date = (d: string) => format.dateTime(new Date(`${d}T00:00:00Z`), { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      {assigned && (
        <p role="status" className="subhead flex items-center gap-1 font-semibold text-success">
          <Icon name="check" width={16} height={16} />
          {t.rich("assigned", { ...isolate, title: assigned })}
        </p>
      )}
      <div className="flex flex-col gap-8">
        {courses.length === 0 ? (
          <EmptyState
            icon="courses"
            title={t("noCoursesTitle")}
            text={t.rich("noCoursesText", { ...isolate, name: className })}
            actions={
              <Link href={`/teacher/courses/new?class=${classId}`} className={buttonClasses({ variant: "secondary" })}>
                {t("newCourse")}
              </Link>
            }
          />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => {
              const meta = [
                t("modules", { count: c.module_count }),
                c.due_date ? t("due", { date: date(c.due_date) }) : t("noDue"),
              ].join(" · ");
              const progressText =
                c.students_complete > 0 || c.students_started === 0
                  ? t("complete", { done: c.students_complete, total: studentCount })
                  : t("started", { done: c.students_started, total: studentCount });
              return (
                <li key={c.course_id}>
                  <Link
                    href={`/teacher/courses/${c.course_id}/review`}
                    className="cc-card cc-card--stack cc-course h-full"
                  >
                    <div className="cc-course__top items-center">
                      <span className="headline line-clamp-2 min-w-0 break-words">
                        <bdi>{c.title}</bdi>
                      </span>
                      {c.students_overdue > 0 ? (
                        <span className="footnote flex flex-none items-center gap-1 font-semibold text-warning">
                          <Icon name="alert" width={14} height={14} />
                          {t("overdue", { count: c.students_overdue })}
                        </span>
                      ) : studentCount > 0 && c.module_count > 0 && c.students_complete === studentCount ? (
                        <span className="footnote flex flex-none items-center gap-1 font-semibold text-success">
                          <Icon name="check" width={14} height={14} />
                          {t("allDone")}
                        </span>
                      ) : null}
                    </div>
                    <div className="subhead flex flex-wrap justify-between gap-2 text-ink-muted">
                      <span>{meta}</span>
                      <span className="tabular-nums">{progressText}</span>
                    </div>
                    <Progress
                      value={c.students_complete}
                      max={studentCount}
                      label={t("progressLabel", { title: c.title })}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <section aria-labelledby="class-settings" className="flex flex-col gap-3">
          <h2 id="class-settings" className="eyebrow text-ink-muted">
            {t("settingsTitle")}
          </h2>
          <div className="cc-entities">
            <Link href={`/teacher/classes/${classId}/edit`} className="cc-entity">
              <span className="cc-entity__lead text-ink-muted">
                <Icon name="pencil" width={20} height={20} />
              </span>
              <span className="cc-entity__body">
                <span className="cc-entity__title">{t("edit")}</span>
              </span>
              <span className="cc-entity__trail text-ink-muted">
                <Icon name="chevronForward" width={18} height={18} />
              </span>
            </Link>
            <Link href={`/teacher/classes/${classId}/delete`} className="cc-entity text-danger">
              <span className="cc-entity__lead">
                <Icon name="trash" width={20} height={20} />
              </span>
              <span className="cc-entity__body">
                <span className="cc-entity__title">{t("delete")}</span>
              </span>
              <span className="cc-entity__trail">
                <Icon name="chevronForward" width={18} height={18} />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
