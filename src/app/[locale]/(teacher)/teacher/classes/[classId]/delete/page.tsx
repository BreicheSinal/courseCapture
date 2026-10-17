import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClassCourses } from "@/components/features/teacher/ClassCourses";
import { DeleteClassDialog } from "@/components/features/teacher/DeleteClassDialog";
import { getClass, getClassCourses } from "@/lib/classes/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/teacher/classes/[classId]/delete">): Promise<Metadata> {
  const [{ classId }, t] = await Promise.all([params, getTranslations("teacher.deleteClass")]);
  const cls = await getClass(classId);
  return { title: cls ? t("metaTitle", { name: cls.name }) : undefined };
}

/** T15 Delete class: the confirmation dialog over the class page. */
export default async function Page({ params }: PageProps<"/[locale]/teacher/classes/[classId]/delete">) {
  const { classId } = await params;
  const [cls, courses] = await Promise.all([getClass(classId), getClassCourses(classId)]);
  if (!cls) notFound();
  return (
    <>
      <ClassCourses classId={cls.id} className={cls.name} courses={courses} studentCount={cls.student_count} />
      <DeleteClassDialog cls={{ ...cls, course_count: courses.length }} />
    </>
  );
}
