import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Generating } from "@/components/features/builder/Generating";
import { PageHeader } from "@/components/features/teacher/PageHeader";
import { redirect } from "@/i18n/navigation";
import { getClass } from "@/lib/classes/queries";
import { getBuilderCourse } from "@/lib/courses/queries";
import { toJobStatus } from "@/lib/generation/actions";

// "Try again" runs the job after its response when Inngest isn't set up.
export const maxDuration = 300;

type Props = PageProps<"/[locale]/teacher/courses/[courseId]/generating">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const [course, t] = await Promise.all([getBuilderCourse(courseId), getTranslations("teacher.generating")]);
  return { title: course ? t("metaTitle", { title: course.title }) : undefined };
}

/** T2 Generating. A finished course goes straight to review. */
export default async function Page({ params, searchParams }: Props) {
  const [{ courseId }, sp, t, locale] = await Promise.all([params, searchParams, getTranslations("teacher.generating"), getLocale()]);
  const course = await getBuilderCourse(courseId);
  if (!course) notFound();
  if (!course.job || course.job.step === "done") redirect({ href: `/teacher/courses/${courseId}/review`, locale });
  const job = course.job!;
  const cls = typeof sp.class === "string" ? await getClass(sp.class) : null;
  const back = cls ? { href: `/teacher/classes/${cls.id}`, label: t("backTo", { name: cls.name }) } : { href: "/teacher/courses", label: t("backToCourses") };
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader title={<bdi>{course.title}</bdi>} subtitle={course.source_name ?? undefined} back={back} />
      <Generating
        courseId={course.id}
        title={course.title}
        initial={await toJobStatus(job, course.jobCount)}
        back={back}
        sourceKind={job.source_kind}
      />
    </div>
  );
}
