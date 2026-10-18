import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { QuickCheck } from "@/components/features/student/QuickCheck";
import { getCourseModules, getModule, getQuizResult, getStudentCourse } from "@/lib/student/queries";

type Props = PageProps<"/[locale]/student/courses/[courseId]/modules/[position]/check">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.quiz");
  return { title: t("metaTitle") };
}

/** S4 Quick check. Modules without a quiz go back to the reader. */
export default async function Page({ params }: Props) {
  const { courseId, position } = await params;
  const [course, modules, mod] = await Promise.all([
    getStudentCourse(courseId),
    getCourseModules(courseId),
    getModule(courseId, Number(position)),
  ]);
  if (!course || !mod) notFound();
  if (!mod.quiz?.options?.length) redirect({ href: `/student/courses/${courseId}/modules/${mod.position}`, locale: await getLocale() });
  const initial = await getQuizResult(mod.id);
  return (
    <QuickCheck
      courseId={course.course_id}
      courseTitle={course.title}
      lang={course.content_locale}
      modules={modules}
      module={{ id: mod.id, position: mod.position, heading: mod.heading, question: mod.quiz!.question, options: mod.quiz!.options }}
      initial={initial}
    />
  );
}
