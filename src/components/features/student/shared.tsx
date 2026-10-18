import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { isComplete, isOverdue } from "@/lib/student/rules";
import type { StudentAnnouncement, StudentCourse } from "@/types/supabase";

/**
 * "Biology · Ms Haddad · due Oct 20": each part isolated in its own <bdi>, so
 * an Arabic class name next to a Latin teacher name keeps its order.
 */
export function Parts({ parts }: { parts: (ReactNode | null | undefined | false)[] }) {
  const kept = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== "");
  return (
    <>
      {kept.map((p, i) => (
        <span key={i}>
          {i > 0 && " · "}
          <bdi>{p}</bdi>
        </span>
      ))}
    </>
  );
}

/** A calendar date (YYYY-MM-DD) formatted for the interface language. */
export function useDateOnly() {
  const format = useFormatter();
  return (d: string) => format.dateTime(new Date(`${d}T00:00:00Z`), { month: "short", day: "numeric" });
}

/** Overdue / complete / not started, always as a word (never colour only). */
export function CourseStatus({ course, today }: { course: StudentCourse; today: string }) {
  const t = useTranslations("student.status");
  if (isComplete(course))
    return (
      <Badge size="sm" variant="success">
        {t("complete")}
      </Badge>
    );
  if (isOverdue(course, today))
    return (
      <Badge size="sm" variant="warning">
        {t("overdue")}
      </Badge>
    );
  if (course.modules_done === 0) return <span className="footnote flex-none text-ink-muted">{t("notStarted")}</span>;
  return null;
}

/** Design-system CourseCard (student): the whole card opens the course. */
export function StudentCourseCard({
  course,
  today,
  showClass = true,
  footer,
}: {
  course: StudentCourse;
  today: string;
  showClass?: boolean;
  footer?: ReactNode;
}) {
  const t = useTranslations("student");
  const date = useDateOnly();
  const due = course.due_date
    ? isOverdue(course, today)
      ? t("courses.wasDue", { date: date(course.due_date) })
      : t("courses.due", { date: date(course.due_date) })
    : null;
  return (
    <Link href={`/student/courses/${course.course_id}`} className="cc-card cc-course h-full">
      <span className="cc-course__top items-center">
        <span className="headline min-w-0 truncate">
          <bdi lang={course.content_locale}>{course.title}</bdi>
        </span>
        <CourseStatus course={course} today={today} />
      </span>
      <span className="cc-course__meta">
        <Parts parts={[showClass ? course.class_name : null, due]} />
      </span>
      <span className="flex items-center gap-3">
        <Progress
          value={course.modules_done}
          max={course.module_count}
          label={t("courses.progressLabel", { title: course.title })}
          className="flex-1"
        />
        <span className="footnote flex-none text-ink-muted tabular-nums">
          {t("courses.doneOf", { done: course.modules_done, total: course.module_count })}
        </span>
      </span>
      {footer}
    </Link>
  );
}

/** Announcements from the student's classes, newest first (design-system Announcement, student view). */
export function AnnouncementList({ items, showClass }: { items: StudentAnnouncement[]; showClass: boolean }) {
  const format = useFormatter();
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((a) => (
        <li key={a.id}>
          <article className="cc-note">
            <div className="cc-note__head">
              <span>
                <strong className="text-ink">
                  <bdi>{a.teacher_name}</bdi>
                </strong>
                {showClass && (
                  <>
                    {" · "}
                    <bdi>{a.class_name}</bdi>
                  </>
                )}
              </span>
              <span>{format.dateTime(new Date(a.created_at), { month: "short", day: "numeric" })}</span>
            </div>
            <p className="cc-note__body" dir="auto">
              {a.body}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** Uppercase section label used across student screens (canvas "Continue", "Assigned"…). */
export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="eyebrow text-ink-muted">
      {children}
    </h2>
  );
}
