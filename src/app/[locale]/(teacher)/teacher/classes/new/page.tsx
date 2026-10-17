import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClassForm } from "@/components/features/teacher/ClassForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.classForm");
  return { title: t("newMetaTitle") };
}

/** T9 Create class. */
export default function Page() {
  return <ClassForm />;
}
