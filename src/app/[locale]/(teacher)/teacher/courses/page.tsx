import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CourseList } from "@/components/features/teacher/CourseList";
import { getSession } from "@/lib/auth/session";
import { getTeacherCourses } from "@/lib/classes/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.courses");
  return { title: t("metaTitle") };
}

/** T16 Courses: all of the teacher's courses, drafts included. */
export default async function Page() {
  const session = await getSession(); // checked by the layout
  const courses = session ? await getTeacherCourses(session.userId) : [];
  return <CourseList courses={courses} />;
}
