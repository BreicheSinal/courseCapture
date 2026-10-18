import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AssignDialog } from "@/components/features/builder/AssignDialog";
import { ReviewCourse } from "@/components/features/builder/ReviewCourse";
import { PageHeader } from "@/components/features/teacher/PageHeader";
import { redirect } from "@/i18n/navigation";
import { getAssignTargets, getBuilderCourse, getBuilderModules } from "@/lib/courses/queries";

type Props = PageProps<"/[locale]/teacher/courses/[courseId]/assign">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const [course, t] = await Promise.all([getBuilderCourse(courseId), getTranslations("teacher.assign")]);
  return { title: course ? t("metaTitle", { title: course.title }) : undefined };
}

/** T5 Assign: the dialog over the review page (canvas). */
export default async function Page({ params }: Props) {
  const [{ courseId }, t, locale] = await Promise.all([params, getTranslations("teacher.review"), getLocale()]);
  const course = await getBuilderCourse(courseId);
  if (!course) notFound();
  if (course.job && course.job.step !== "done") redirect({ href: `/teacher/courses/${courseId}/generating`, locale });
  const [modules, targets] = await Promise.all([getBuilderModules(courseId, course.content_locale), getAssignTargets(courseId)]);
  const today = new Date().toISOString().slice(0, 10); // dates are UTC (decision #41)
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader titleAs="p" title={t("title")} back={{ href: "/teacher/courses", label: t("backToCourses") }} />
      <ReviewCourse course={course} modules={modules} assignedCount={0} notice={null} />
      <AssignDialog
        course={{ id: course.id, title: course.title, moduleCount: modules.length }}
        classes={targets.classes}
        assigned={Object.fromEntries(targets.assigned)}
        unchecked={modules.filter((m) => !m.checked_at).length}
        today={today}
      />
    </div>
  );
}
