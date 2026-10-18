import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStudentAnnouncements, getStudentClasses, getStudentCourses } from "@/lib/student/queries";
import { todayIso } from "@/lib/student/rules";
import { requestTime } from "@/lib/utils/time";
import { StudentClassPage } from "@/components/features/student/StudentClasses";

type Props = PageProps<"/[locale]/student/classes/[classId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { classId } = await params;
  const cls = (await getStudentClasses()).find((c) => c.class_id === classId);
  return { title: cls?.name };
}

/** S7 Class page (student). Only the student's own classes are found. */
export default async function Page({ params, searchParams }: Props) {
  const [{ classId }, sp] = await Promise.all([params, searchParams]);
  const [classes, courses] = await Promise.all([getStudentClasses(), getStudentCourses()]);
  const cls = classes.find((c) => c.class_id === classId);
  if (!cls) notFound();
  const announcements = await getStudentAnnouncements(classId, 20);
  return (
    <StudentClassPage
      cls={cls}
      courses={courses.filter((c) => c.class_id === classId)}
      announcements={announcements}
      today={todayIso(requestTime())}
      joined={!!sp.joined}
    />
  );
}
