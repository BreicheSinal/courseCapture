import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentAccount } from "@/components/features/student/StudentAccount";
import { getSession } from "@/lib/auth/session";
import { getStudentClasses } from "@/lib/student/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.account");
  return { title: t("metaTitle") };
}

/** Desktop S8 Account (student). */
export default async function Page() {
  const [session, classes] = await Promise.all([getSession(), getStudentClasses()]);
  if (!session) return null;
  return <StudentAccount profile={{ full_name: session.profile.full_name, email: session.email }} classes={classes} />;
}
