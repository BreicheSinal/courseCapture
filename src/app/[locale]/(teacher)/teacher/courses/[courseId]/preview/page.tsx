import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CoursePreview } from "@/components/features/builder/CoursePreview";
import { PageHeader } from "@/components/features/teacher/PageHeader";
import { redirect } from "@/i18n/navigation";
import { getBuilderCourse, getBuilderModules } from "@/lib/courses/queries";

type Props = PageProps<"/[locale]/teacher/courses/[courseId]/preview">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const [course, t] = await Promise.all([getBuilderCourse(courseId), getTranslations("teacher.preview")]);
  return { title: course ? t("metaTitle", { title: course.title }) : undefined };
}

/** Preview: the student player, read-only (`?module=` picks the module). */
export default async function Page({ params, searchParams }: Props) {
  const [{ courseId }, sp, t, locale] = await Promise.all([
    params,
    searchParams,
    getTranslations("teacher.preview"),
    getLocale(),
  ]);
  const course = await getBuilderCourse(courseId);
  if (!course) notFound();
  if (course.job && course.job.step !== "done") redirect({ href: `/teacher/courses/${courseId}/generating`, locale });
  const modules = await getBuilderModules(courseId, course.content_locale);
  if (!modules.length) notFound();
  const current = modules.find((m) => m.position === Number(sp.module)) ?? modules[0];
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        title={t("title")}
        back={{ href: `/teacher/courses/${courseId}/review`, label: t("backTo", { title: course.title }) }}
      />
      <CoursePreview
        courseId={courseId}
        title={course.title}
        modules={modules}
        current={current}
        lang={course.content_locale}
      />
    </div>
  );
}
