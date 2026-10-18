import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/features/student/Reader";
import { getCourseModules, getModule, getStudentCourse } from "@/lib/student/queries";

type Props = PageProps<"/[locale]/student/courses/[courseId]/modules/[position]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId, position } = await params;
  const mod = await getModule(courseId, Number(position));
  return { title: mod?.heading };
}

/** S3 Module reader. */
export default async function Page({ params }: Props) {
  const { courseId, position } = await params;
  const [course, modules, mod] = await Promise.all([
    getStudentCourse(courseId),
    getCourseModules(courseId),
    getModule(courseId, Number(position)),
  ]);
  if (!course || !mod) notFound();
  return <Reader course={course} modules={modules} module={mod} />;
}
