import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClassCourses } from "@/components/features/teacher/ClassCourses";
import { getClass, getClassCourses } from "@/lib/classes/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/teacher/classes/[classId]">): Promise<Metadata> {
  const [{ classId }, t] = await Promise.all([params, getTranslations("teacher.classPage")]);
  const cls = await getClass(classId);
  return { title: cls ? t("metaTitle", { name: cls.name }) : undefined };
}

/** T6 Class page · Courses. */
export default async function Page({ params }: PageProps<"/[locale]/teacher/classes/[classId]">) {
  const { classId } = await params;
  const [cls, courses] = await Promise.all([getClass(classId), getClassCourses(classId)]);
  if (!cls) notFound();
  return <ClassCourses classId={cls.id} className={cls.name} courses={courses} studentCount={cls.student_count} />;
}
