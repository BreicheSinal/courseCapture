import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Finish } from "@/components/features/student/Finish";
import { getSession } from "@/lib/auth/session";
import { getStudentClasses, getStudentCourse } from "@/lib/student/queries";
import { isComplete } from "@/lib/student/rules";

type Props = PageProps<"/[locale]/student/courses/[courseId]/finish">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.finish");
  return { title: t("metaTitle") };
}

/** S6 Finish and certificate. Only once every module is done; otherwise back to the overview. */
export default async function Page({ params }: Props) {
  const { courseId } = await params;
  const [course, classes, session, t] = await Promise.all([
    getStudentCourse(courseId),
    getStudentClasses(),
    getSession(),
    getTranslations("teacher"),
  ]);
  if (!course) notFound();
  if (!isComplete(course)) redirect({ href: `/student/courses/${courseId}`, locale: await getLocale() });
  const cls = classes.find((c) => c.class_id === course.class_id);
  const classLabel = cls ? (cls.section ? t("classWithSection", { name: cls.name, section: cls.section }) : cls.name) : course.class_name;
  return (
    <Finish
      course={course}
      studentName={session?.profile.full_name || session?.email || ""}
      teacherName={cls?.teacher_name ?? ""}
      classLabel={classLabel}
    />
  );
}
