import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TeacherCourse } from "@/lib/classes/queries";
import { PageHeader } from "./PageHeader";

/** Canvas T16 · Courses: every course the teacher has, drafts included. */
export function CourseList({ courses }: { courses: TeacherCourse[] }) {
  const t = useTranslations("teacher.courses");
  const tt = useTranslations("teacher");
  const format = useFormatter();
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
                  c.classes.map((k) => (k.section ? tt("classWithSection", { name: k.name, section: k.section }) : k.name)),
                  { type: "unit" },
                )
              : t("noClass");
            const due = c.classes.find((k) => k.due_date)?.due_date;
            const meta = [where, t("modules", { count: c.module_count }), due ? t("due", { date: date(due) }) : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={c.id} className="cc-card cc-card--stack h-full">
                <div className="cc-course__top items-center">
                  <span className="headline min-w-0 truncate">
                    <bdi>{c.title}</bdi>
                  </span>
                  <Badge size="sm" variant={c.status === "assigned" ? "info" : "neutral"}>
                    {t(`status_${c.status}`)}
                  </Badge>
                </div>
                <span className="subhead text-ink-muted">{meta}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
