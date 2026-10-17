import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Announcements } from "@/components/features/teacher/Announcements";
import { getAnnouncements, getClass } from "@/lib/classes/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/teacher/classes/[classId]/announcements">): Promise<Metadata> {
  const [{ classId }, t] = await Promise.all([params, getTranslations("teacher.announcements")]);
  const cls = await getClass(classId);
  return { title: cls ? t("metaTitle", { name: cls.name }) : undefined };
}

/** T13 New announcement and past announcements. */
export default async function Page({ params }: PageProps<"/[locale]/teacher/classes/[classId]/announcements">) {
  const { classId } = await params;
  const [cls, items] = await Promise.all([getClass(classId), getAnnouncements(classId)]);
  if (!cls) notFound();
  return <Announcements classId={cls.id} className={cls.name} studentCount={cls.student_count} items={items} />;
}
