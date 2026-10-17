import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Roster } from "@/components/features/teacher/Roster";
import { getClass, getClassCourses, getRoster } from "@/lib/classes/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/teacher/classes/[classId]/students">): Promise<Metadata> {
  const [{ classId }, t] = await Promise.all([params, getTranslations("teacher.roster")]);
  const cls = await getClass(classId);
  return { title: cls ? t("metaTitle", { name: cls.name }) : undefined };
}

/** T11 Roster. `?course=` picks the course whose progress is shown (default: newest). */
export default async function Page({ params, searchParams }: PageProps<"/[locale]/teacher/classes/[classId]/students">) {
  const [{ classId }, sp] = await Promise.all([params, searchParams]);
  const [cls, courses] = await Promise.all([getClass(classId), getClassCourses(classId)]);
  if (!cls) notFound();
  const courseId = courses.find((c) => c.course_id === sp.course)?.course_id ?? courses[0]?.course_id ?? null;
  const students = await getRoster(classId, courseId);
  return (
    <Roster
      classId={cls.id}
      joinCode={cls.join_code}
      students={students}
      courses={courses}
      courseId={courseId}
      notice={sp.removed ? "removed" : undefined}
      focusStudent={typeof sp.focus === "string" ? sp.focus : undefined}
    />
  );
}
