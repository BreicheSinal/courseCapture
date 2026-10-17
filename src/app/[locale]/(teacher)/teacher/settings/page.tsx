import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherSettings } from "@/components/features/teacher/TeacherSettings";
import { getSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.settings");
  return { title: t("metaTitle") };
}

/** T14 Settings. */
export default async function Page() {
  const session = await getSession(); // checked by the layout
  if (!session) return null;
  return <TeacherSettings profile={{ ...session.profile, email: session.email }} />;
}
