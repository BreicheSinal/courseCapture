import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Roster } from "@/components/features/teacher/Roster";
import { StudentPanel } from "@/components/features/teacher/StudentPanel";
import { getClass, getClassCourses, getRoster, getStudentCourse } from "@/lib/classes/queries";

type Props = PageProps<"/[locale]/teacher/classes/[classId]/students/[studentId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ classId, studentId }, t] = await Promise.all([params, getTranslations("teacher.student")]);
  const roster = await getRoster(classId, null);
  const s = roster.find((r) => r.student_id === studentId);
  return { title: s ? t("metaTitle", { name: s.full_name || s.email }) : undefined };
}

/** T12 Student panel, over the roster. Only students in this class are found (RLS + roster). */
export default async function Page({ params, searchParams }: Props) {
  const [{ classId, studentId }, sp] = await Promise.all([params, searchParams]);
  const [cls, courses] = await Promise.all([getClass(classId), getClassCourses(classId)]);
  if (!cls) notFound();
  const course = courses.find((c) => c.course_id === sp.course) ?? courses[0] ?? null;
  const students = await getRoster(classId, course?.course_id ?? null);
  const student = students.find((s) => s.student_id === studentId);
  if (!student) notFound();
  const modules = course ? await getStudentCourse(studentId, course.course_id) : [];
  return (
    <>
      <Roster classId={cls.id} joinCode={cls.join_code} students={students} courses={courses} courseId={course?.course_id ?? null} />
      <StudentPanel
        classId={cls.id}
        className={cls.name}
        student={{ id: student.student_id, name: student.full_name || student.email, email: student.email, joined_at: student.joined_at }}
        courseId={course?.course_id ?? null}
        courseTitle={course?.title ?? null}
        modules={modules}
      />
    </>
  );
}
