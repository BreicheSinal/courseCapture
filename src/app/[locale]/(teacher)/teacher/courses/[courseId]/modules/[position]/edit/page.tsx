import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ModuleEditor } from "@/components/features/builder/ModuleEditor";
import { PageHeader } from "@/components/features/teacher/PageHeader";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Link, redirect } from "@/i18n/navigation";
import { dailyLimits, isAiConfigured } from "@/lib/ai";
import { getBuilderCourse, getBuilderModules, getUsageToday, RTL_LOCALES } from "@/lib/courses/queries";
import { cn } from "@/lib/utils/cn";

type Props = PageProps<"/[locale]/teacher/courses/[courseId]/modules/[position]/edit">;

// Regenerating a diagram calls the AI from this page's action.
export const maxDuration = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId, position } = await params;
  const [course, t] = await Promise.all([getBuilderCourse(courseId), getTranslations("teacher.editModule")]);
  return { title: course ? t("metaTitle", { n: position, title: course.title }) : undefined };
}

/** T4 Edit module. The module list sits beside the editor on wide screens (canvas Desk T4). */
export default async function Page({ params }: Props) {
  const [{ courseId, position }, t, locale] = await Promise.all([
    params,
    getTranslations("teacher.editModule"),
    getLocale(),
  ]);
  const course = await getBuilderCourse(courseId);
  if (!course) notFound();
  if (course.job && course.job.step !== "done") redirect({ href: `/teacher/courses/${courseId}/generating`, locale });
  const [modules, usage] = await Promise.all([getBuilderModules(courseId, course.content_locale), getUsageToday()]);
  const mod = modules.find((m) => m.position === Number(position));
  if (!mod) notFound();
  const base = `/teacher/courses/${courseId}`;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        title={<bdi dir="auto">{mod.heading}</bdi>}
        subtitle={t("position", { n: mod.position, total: modules.length })}
        back={{ href: `${base}/review`, label: t("backTo", { title: course.title }) }}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card as="div" className="h-fit p-2">
          <nav className="cc-toc" aria-label={t("modulesNav")}>
            {modules.map((m) => (
              <Link
                key={m.id}
                href={`${base}/modules/${m.position}/edit`}
                aria-current={m.id === mod.id ? "page" : undefined}
                className={cn(
                  "cc-toc__item min-h-control no-underline",
                  m.id === mod.id && "is-current",
                  m.checked_at && "is-done",
                )}
              >
                <span className="cc-toc__mark">
                  {m.checked_at ? (
                    <>
                      <Icon name="check" width={16} height={16} />
                      <span className="sr-only">{t("checked")}</span>
                    </>
                  ) : (
                    `${m.position}.`
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate" dir="auto">
                  {m.heading}
                </span>
                {!m.checked_at && m.review_note && (
                  <span className="caption flex-none font-semibold text-warning">{t("checkTag")}</span>
                )}
              </Link>
            ))}
          </nav>
        </Card>
        <ModuleEditor
          key={mod.id}
          courseId={courseId}
          module={mod}
          total={modules.length}
          contentLocale={course.content_locale}
          aiReady={isAiConfigured("visual")}
          redrawsLeft={Math.max(0, dailyLimits().redraw - (usage.redraw ?? 0))}
          isRtl={RTL_LOCALES.has(course.content_locale)}
        />
      </div>
    </div>
  );
}
