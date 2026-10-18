import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ReviewCourse } from "@/components/features/builder/ReviewCourse";
import { PageHeader } from "@/components/features/teacher/PageHeader";
import { redirect } from "@/i18n/navigation";
import { getBuilderCourse, getBuilderModules } from "@/lib/courses/queries";

type Props = PageProps<"/[locale]/teacher/courses/[courseId]/review">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const [course, t] = await Promise.all([getBuilderCourse(courseId), getTranslations("teacher.review")]);
  return { title: course ? t("metaTitle", { title: course.title }) : undefined };
}

/** T3 Review course. Still generating (or failed) → T2. */
export default async function Page({ params, searchParams }: Props) {
  const [{ courseId }, sp, t, locale] = await Promise.all([
    params,
    searchParams,
    getTranslations("teacher.review"),
    getLocale(),
  ]);
  const course = await getBuilderCourse(courseId);
  if (!course) notFound();
  if (course.job && course.job.step !== "done") redirect({ href: `/teacher/courses/${courseId}/generating`, locale });
  const modules = await getBuilderModules(courseId, course.content_locale);
  const notice =
    sp.generated === "1"
      ? "generated"
      : sp.assigned
        ? "assigned"
        : sp.checked === "1"
          ? "checked"
          : sp.moduleDeleted === "1"
            ? "moduleDeleted"
            : null;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader titleAs="p" title={t("title")} back={{ href: "/teacher/courses", label: t("backToCourses") }} />
      <ReviewCourse course={course} modules={modules} assignedCount={Number(sp.assigned) || 0} notice={notice} />
    </div>
  );
}
