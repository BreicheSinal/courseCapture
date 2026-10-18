import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { isComplete } from "@/lib/student/rules";
import type { StudentAnnouncement, StudentCourse } from "@/types/supabase";
import { PageHeader } from "../teacher/PageHeader";
import { MarkSeen } from "./MarkSeen";
import { AnnouncementList, SectionTitle, StudentCourseCard } from "./shared";

/**
 * Canvas S2 · Home (phone) / Desktop S2: the course to continue, the other
 * assigned courses, and the latest announcements.
 */
export function StudentHome({
  courses,
  continueCourse,
  resume,
  announcements,
  today,
}: {
  courses: StudentCourse[];
  continueCourse: StudentCourse | null;
  /** Module number to resume in the continue course. */
  resume: number | null;
  announcements: StudentAnnouncement[];
  today: string;
}) {
  const t = useTranslations("student.home");
  const others = courses.filter((c) => c !== continueCourse);
  const open = others.filter((c) => !isComplete(c));
  const done = others.filter(isComplete);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} size="large" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          {courses.length === 0 ? (
            <EmptyState
              icon="courses"
              headingLevel={2}
              title={t("emptyTitle")}
              text={t("emptyText")}
              actions={
                <Link href="/student/join" className={buttonClasses({ variant: "secondary" })}>
                  {t("join")}
                </Link>
              }
            />
          ) : (
            <>
              {continueCourse && (
                <section aria-labelledby="continue" className="flex flex-col gap-3">
                  <SectionTitle id="continue">{t("continue")}</SectionTitle>
                  <StudentCourseCard
                    course={continueCourse}
                    today={today}
                    footer={
                      <span className={buttonClasses({ variant: "primary", block: true })}>
                        {resume && continueCourse.modules_done > 0 ? t("resume", { n: resume }) : t("start")}
                      </span>
                    }
                  />
                </section>
              )}
              {open.length > 0 && (
                <section aria-labelledby="assigned" className="flex flex-col gap-3">
                  <SectionTitle id="assigned">{t("assigned")}</SectionTitle>
                  <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
                    {open.map((c) => (
                      <li key={`${c.course_id}-${c.class_id}`}>
                        <StudentCourseCard course={c} today={today} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {done.length > 0 && (
                <section aria-labelledby="done" className="flex flex-col gap-3">
                  <SectionTitle id="done">{t("finished")}</SectionTitle>
                  <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
                    {done.map((c) => (
                      <li key={`${c.course_id}-${c.class_id}`}>
                        <StudentCourseCard course={c} today={today} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <aside aria-labelledby="news" className="flex min-w-0 flex-col gap-3">
          <SectionTitle id="news">
            {announcements.length > 1 ? t("announcements") : t("latestAnnouncement")}
          </SectionTitle>
          {announcements.length === 0 ? (
            <p className="subhead text-ink-muted">{t("noAnnouncements")}</p>
          ) : (
            <>
              <AnnouncementList items={announcements} showClass />
              <MarkSeen ids={announcements.filter((a) => !a.seen).map((a) => a.id)} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
