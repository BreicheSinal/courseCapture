import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { StudentAnnouncement, StudentClass, StudentCourse } from "@/types/supabase";
import { PageHeader } from "../teacher/PageHeader";
import { JoinedNotice } from "./JoinedNotice";
import { MarkSeen } from "./MarkSeen";
import { AnnouncementList, Parts, SectionTitle, StudentCourseCard } from "./shared";

/** Desktop S7 · Classes: every class the student is in, with Join a class. */
export function StudentClassList({ classes, courses }: { classes: StudentClass[]; courses: StudentCourse[] }) {
  const t = useTranslations("student.classes");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        size="large"
        actions={
          <Link href="/student/join" className={buttonClasses({ variant: "secondary" })}>
            {t("join")}
          </Link>
        }
      />
      {classes.length === 0 ? (
        <EmptyState icon="classes" title={t("emptyTitle")} text={t("emptyText")} />
      ) : (
        <ul className="cc-entities m-0 max-w-3xl list-none p-0">
          {classes.map((c) => {
            const n = courses.filter((k) => k.class_id === c.class_id).length;
            return (
              <li key={c.class_id} className="border-b border-line last:border-b-0">
                <Link href={`/student/classes/${c.class_id}`} className="cc-entity border-0">
                  <span className="cc-entity__body">
                    <span className="cc-entity__title">
                      <bdi>{c.name}</bdi>
                    </span>
                    <span className="cc-entity__desc">
                      <Parts parts={[c.teacher_name, c.section, t("courses", { count: n })]} />
                    </span>
                  </span>
                  <span className="cc-entity__trail text-ink-muted">
                    <Icon name="chevronForward" width={18} height={18} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Canvas S7 · Class page (student): its courses and announcements. */
export function StudentClassPage({
  cls,
  courses,
  announcements,
  today,
  joined,
}: {
  cls: StudentClass;
  courses: StudentCourse[];
  announcements: StudentAnnouncement[];
  today: string;
  joined?: boolean;
}) {
  const t = useTranslations("student.classPage");
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={cls.name}
        subtitle={<Parts parts={[cls.teacher_name, cls.section]} />}
        size="large"
        back={{ href: "/student/classes", label: t("back") }}
      />
      {joined && <JoinedNotice>{t.rich("joined", { name: cls.name, n: (c) => <bdi>{c}</bdi> })}</JoinedNotice>}
      <section aria-labelledby="courses" className="flex flex-col gap-3">
        <SectionTitle id="courses">{t("courses")}</SectionTitle>
        {courses.length === 0 ? (
          <EmptyState icon="courses" inline title={t("noCoursesTitle")} text={t("noCoursesText")} />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {courses.map((c) => (
              <li key={c.course_id}>
                <StudentCourseCard course={c} today={today} showClass={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="news" className="flex flex-col gap-3">
        <SectionTitle id="news">{t("announcements")}</SectionTitle>
        {announcements.length === 0 ? (
          <p className="subhead text-ink-muted">{t("noAnnouncements")}</p>
        ) : (
          <>
            <AnnouncementList items={announcements} showClass={false} />
            <MarkSeen ids={announcements.filter((a) => !a.seen).map((a) => a.id)} />
          </>
        )}
      </section>
    </div>
  );
}
