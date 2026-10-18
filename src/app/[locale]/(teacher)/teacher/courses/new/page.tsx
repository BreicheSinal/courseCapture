import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewCourseForm } from "@/components/features/builder/NewCourseForm";
import { PageHeader } from "@/components/features/teacher/PageHeader";
import { dailyLimits, isAiConfigured } from "@/lib/ai";
import { getSession } from "@/lib/auth/session";
import { getClass } from "@/lib/classes/queries";
import { getUsageToday } from "@/lib/courses/queries";

// Without Inngest the job runs after the "Generate course" action responds, within this limit.
export const maxDuration = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.newCourse");
  return { title: t("metaTitle") };
}

/** T1 New course. `?class=` (from a class page) sets where "Back" goes. */
export default async function Page({ searchParams }: PageProps<"/[locale]/teacher/courses/new">) {
  const [sp, session, t, usage] = await Promise.all([searchParams, getSession(), getTranslations("teacher.newCourse"), getUsageToday()]);
  const classId = typeof sp.class === "string" ? sp.class : null;
  const cls = classId ? await getClass(classId) : null;
  const back = cls ? { href: `/teacher/classes/${cls.id}`, label: t("backTo", { name: cls.name }) } : { href: "/teacher/courses", label: t("backToCourses") };
  const left = Math.max(0, dailyLimits().generate - (usage.generate ?? 0));
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader title={t("title")} back={back} />
      <NewCourseForm
        classId={cls?.id ?? null}
        defaults={{
          locale: session?.profile.default_course_locale ?? "en",
          level: session?.profile.default_course_level ?? "intermediate",
        }}
        aiReady={isAiConfigured("generate")}
        generationsLeft={left}
      />
    </div>
  );
}
