import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentClassList } from "@/components/features/student/StudentClasses";
import { getStudentClasses, getStudentCourses } from "@/lib/student/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.classes");
  return { title: t("metaTitle") };
}

/** S7 Classes: the student's classes. */
export default async function Page() {
  const [classes, courses] = await Promise.all([getStudentClasses(), getStudentCourses()]);
  return <StudentClassList classes={classes} courses={courses} />;
}
