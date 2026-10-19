import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { TeacherCourse } from "@/lib/classes/queries";
import { PageHeader } from "./PageHeader";

/** Canvas T16 · Courses: every course the teacher has, drafts included. */
export function CourseList({ courses, deleted = false }: { courses: TeacherCourse[]; deleted?: boolean }) {
  const t = useTranslations("teacher.courses");
  const tt = useTranslations("teacher");
  const format = useFormatter();
  const today = new Date().toISOString().slice(0, 10); // UTC dates (decision #41)
  const date = (d: string) => format.dateTime(new Date(`${d}T00:00:00Z`), { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        size="large"
        actions={
          <Link href="/teacher/courses/new" className={buttonClasses({ variant: "primary" })}>
            {t("new")}
          </Link>
        }
      />
      {deleted && (
        <p role="status" className="subhead flex items-center gap-1 font-semibold text-success">
          <Icon name="check" width={16} height={16} />
          {t("deleted")}
        </p>
      )}
      {courses.length === 0 ? (
        <EmptyState
          icon="courses"
          title={t("emptyTitle")}
          text={t("emptyText")}
          actions={
            <Link href="/teacher/courses/new" className={buttonClasses({ variant: "secondary" })}>
              {t("new")}
            </Link>
          }
        />
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const where = c.classes.length
              ? format.list(
                  c.classes.map((k) =>
                    k.section ? tt("classWithSection", { name: k.name, section: k.section }) : k.name,
                  ),
                  { type: "unit" },
                )
              : t("noClass");
            const due = c.classes.find((k) => k.due_date)?.due_date;
            const meta = [where, t("modules", { count: c.module_count }), due ? t("due", { date: date(due) }) : null]
              .filter(Boolean)
              .join(" · ");
            const running = c.job && c.job.step !== "done" && c.job.step !== "failed";
            const failed = c.job?.step === "failed";
            const href = running || failed ? `/teacher/courses/${c.id}/generating` : `/teacher/courses/${c.id}/review`;
            const overdue = c.classes.some((k) => k.due_date && k.due_date < today);
            const line = running ? t("generatingLine", { percent: c.job!.percent }) : failed ? t("failedLine") : meta;
            return (
              <li key={c.id} className="h-full">
                <Link href={href} className="cc-card cc-card--stack cc-course h-full">
                  <span className="cc-course__top items-center">
                    <span className="headline line-clamp-2 min-w-0 break-words">
                      <bdi>{c.title}</bdi>
                    </span>
                    {running ? (
                      <span className="footnote flex flex-none items-center gap-2 font-semibold text-accent-text">
                        <span className="size-2 rounded-pill bg-accent" aria-hidden="true" />
                        {t("status_generating")}
                      </span>
                    ) : failed ? (
                      <Badge size="sm" variant="danger">
                        {t("status_failed")}
                      </Badge>
                    ) : c.status === "draft" ? (
                      <Badge size="sm" variant="success">
                        {t("status_ready")}
                      </Badge>
                    ) : (
                      <Badge size="sm" variant={overdue ? "warning" : "info"}>
                        {overdue ? t("status_overdue") : t(`status_${c.status}`)}
                      </Badge>
                    )}
                  </span>
                  <span className="subhead text-ink-muted">{line}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
