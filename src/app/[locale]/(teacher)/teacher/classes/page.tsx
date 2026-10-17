import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClassList } from "@/components/features/teacher/ClassList";
import { FirstRun } from "@/components/features/teacher/FirstRun";
import { getClassSummaries } from "@/lib/classes/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.classList");
  return { title: t("metaTitle") };
}

/** T10 Class list, or T8 First run when the teacher has no classes. */
export default async function Page({ searchParams }: PageProps<"/[locale]/teacher/classes">) {
  const [classes, { deleted }] = await Promise.all([getClassSummaries(), searchParams]);
  if (classes.length === 0) return <FirstRun />;
  return <ClassList classes={classes} notice={deleted ? "deleted" : undefined} />;
}
