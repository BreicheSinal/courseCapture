import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSvg } from "@/lib/svg/sanitize";
import type { ModuleRow, StudentAnnouncement, StudentClass, StudentCourse, StudentModuleState } from "@/types/supabase";

/**
 * Reads for the student screens. All go through the student's own client;
 * the database functions return only the caller's data (docs/schema.md).
 */

export const getStudentClasses = cache(async (): Promise<StudentClass[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("student_classes");
  return data ?? [];
});

export const getStudentCourses = cache(async (): Promise<StudentCourse[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("student_courses");
  return data ?? [];
});

/** One assigned course for the student (the row with the nearest due date if it's in two classes). */
export async function getStudentCourse(courseId: string): Promise<StudentCourse | null> {
  const rows = (await getStudentCourses()).filter((c) => c.course_id === courseId);
  if (!rows.length) return null;
  return [...rows].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];
}

export const getCourseModules = cache(async (courseId: string): Promise<StudentModuleState[]> => {
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("student_course_modules", { p_course: courseId });
  return data ?? [];
});

export type ModuleContent = Omit<ModuleRow, "visual_svg"> & { visual_svg: string | null };

/** S3: one module's content. The SVG is sanitised again on the way out (defence in depth). */
export async function getModule(courseId: string, position: number): Promise<ModuleContent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || !Number.isInteger(position) || position < 1) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select(
      "id, course_id, position, heading, body, key_points, flashcards, quiz, visual_svg, visual_caption, visual_alt",
    )
    .eq("course_id", courseId)
    .eq("position", position)
    .maybeSingle();
  if (!data) return null;
  // The course list is cached per request, so this adds no query.
  const courseLocale = (await getStudentCourse(courseId))?.content_locale;
  const svg =
    data.visual_svg && data.visual_alt
      ? sanitizeSvg(data.visual_svg, {
          idPrefix: `m${data.position}`,
          rtl: ["ar", "he", "fa", "ur"].includes(courseLocale ?? ""),
        })
      : null;
  return { ...data, visual_svg: svg };
}

/** S4: the student's first answer for a module, if any. */
export async function getQuizResult(moduleId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(moduleId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_quiz_result", { p_module: moduleId });
  return data?.[0] ?? null;
}

export async function getStudentAnnouncements(classId?: string, limit = 20): Promise<StudentAnnouncement[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("student_announcements", { p_class: classId ?? null, p_limit: limit });
  return data ?? [];
}
