import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinForm } from "@/components/features/student/JoinForm";
import { getSession } from "@/lib/auth/session";
import { getStudentClasses } from "@/lib/student/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.join");
  return { title: t("metaTitle") };
}

/** S1 Join a class. */
export default async function Page() {
  const [session, classes] = await Promise.all([getSession(), getStudentClasses()]);
  const first = (session?.profile.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  return <JoinForm firstName={first} hasClasses={classes.length > 0} />;
}
