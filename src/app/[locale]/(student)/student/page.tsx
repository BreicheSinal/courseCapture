import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { StudentHome } from "@/components/features/student/StudentHome";
import { getCourseModules, getStudentAnnouncements, getStudentClasses, getStudentCourses } from "@/lib/student/queries";
import { isComplete, resumePosition, todayIso } from "@/lib/student/rules";
import { requestTime } from "@/lib/utils/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.home");
  return { title: t("metaTitle") };
}

/** S2 Home. A student with no classes starts at S1 Join. */
export default async function Page() {
  const [classes, courses, announcements] = await Promise.all([
    getStudentClasses(),
    getStudentCourses(),
    getStudentAnnouncements(undefined, 3),
  ]);
  if (classes.length === 0) redirect({ href: "/student/join", locale: await getLocale() });
  const today = todayIso(requestTime());
  // Continue: the course worked on most recently that isn't finished, else the next one due.
  const open = courses.filter((c) => !isComplete(c));
  const continueCourse =
    [...open].filter((c) => c.last_done_at).sort((a, b) => b.last_done_at!.localeCompare(a.last_done_at!))[0] ?? open[0] ?? null;
  const resume = continueCourse ? resumePosition(await getCourseModules(continueCourse.course_id)) : null;
  return (
    <StudentHome
      courses={courses}
      continueCourse={continueCourse}
      resume={resume}
      announcements={announcements}
      today={today}
    />
  );
}
