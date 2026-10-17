import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClassForm } from "@/components/features/teacher/ClassForm";
import { getClass } from "@/lib/classes/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.classForm");
  return { title: t("editMetaTitle") };
}

/** Edit a class's name and section (T9 "Edit class name", from the class page). */
export default async function Page({ params }: PageProps<"/[locale]/teacher/classes/[classId]/edit">) {
  const { classId } = await params;
  const cls = await getClass(classId);
  if (!cls) notFound();
  return <ClassForm existing={cls} />;
}
