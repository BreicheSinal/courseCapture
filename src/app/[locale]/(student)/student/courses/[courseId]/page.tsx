import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseOverview } from "@/components/features/student/CourseOverview";
import { getCourseModules, getStudentCourse } from "@/lib/student/queries";
import { resumePosition, todayIso } from "@/lib/student/rules";
import { requestTime } from "@/lib/utils/time";

type Props = PageProps<"/[locale]/student/courses/[courseId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  return { title: (await getStudentCourse(courseId))?.title };
}

/** S8 Course overview. Only courses assigned to the student's classes are found. */
export default async function Page({ params }: Props) {
  const { courseId } = await params;
  const [course, modules] = await Promise.all([getStudentCourse(courseId), getCourseModules(courseId)]);
  if (!course) notFound();
  return <CourseOverview course={course} modules={modules} resume={resumePosition(modules)} today={todayIso(requestTime())} />;
}
