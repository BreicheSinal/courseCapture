import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSvg } from "@/lib/svg/sanitize";
import type { CourseRow, GenerationJobRow, ModuleRow, QuizAnswerRow } from "@/types/supabase";

/**
 * Reads for the course builder (T1–T5, T16). All as the signed-in teacher,
 * so RLS returns only their own courses.
 */
const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
export const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

/** How many counted AI actions the caller used today, by kind. */
export async function getUsageToday(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_ai_usage_today");
  return Object.fromEntries((data ?? []).map((r) => [r.kind, r.used]));
}

export type BuilderCourse = CourseRow & { job: GenerationJobRow | null; jobCount: number };

/** The course and its latest generation job; null when it isn't the caller's. */
export const getBuilderCourse = cache(async (courseId: string): Promise<BuilderCourse | null> => {
  if (!isId(courseId)) return null;
  const supabase = await createClient();
  const [{ data: course }, { data: jobs }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
    supabase
      .from("generation_jobs")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);
  if (!course) return null;
  return { ...course, job: jobs?.[0] ?? null, jobCount: jobs?.length ?? 0 };
});

/** Every column clients may read (all but review_note). */
const MODULE_COLUMNS = "id, course_id, position, heading, body, key_points, flashcards, quiz, visual_svg, visual_caption, visual_alt, checked_at";

export type BuilderModule = ModuleRow & { answer: Pick<QuizAnswerRow, "answer_index" | "explanation"> | null };

/** Every module with its quiz answer. Diagrams are sanitised again on the way out. */
export const getBuilderModules = cache(async (courseId: string, locale: string): Promise<BuilderModule[]> => {
  if (!isId(courseId)) return [];
  const supabase = await createClient();
  // review_note isn't readable column-wise (students mustn't see it); it comes from module_review_notes().
  const { data: modules } = await supabase
    .from("modules")
    .select(MODULE_COLUMNS)
    .eq("course_id", courseId)
    .order("position");
  if (!modules?.length) return [];
  const [{ data: answers }, { data: notes }] = await Promise.all([
    supabase
      .from("quiz_answers")
      .select("module_id, answer_index, explanation")
      .in(
        "module_id",
        modules.map((m) => m.id),
      ),
    supabase.rpc("module_review_notes", { p_course: courseId }),
  ]);
  const byModule = new Map((answers ?? []).map((a) => [a.module_id, a]));
  const noteOf = new Map((notes ?? []).map((r) => [r.module_id, r.review_note]));
  return modules.map((m) => ({
    ...m,
    review_note: noteOf.get(m.id) ?? null,
    visual_svg: m.visual_svg
      ? sanitizeSvg(m.visual_svg, { idPrefix: `m${m.position}`, rtl: RTL_LOCALES.has(locale) })
      : null,
    answer: byModule.get(m.id) ?? null,
  }));
});

export type TeacherClassOption = { id: string; name: string; section: string; student_count: number };

/** T5: the teacher's classes and where this course is already assigned. */
export async function getAssignTargets(courseId: string) {
  const supabase = await createClient();
  const [{ data: summaries }, { data: assigned }] = await Promise.all([
    supabase.rpc("teacher_class_summaries"),
    supabase.from("course_assignments").select("class_id, due_date").eq("course_id", courseId),
  ]);
  const classes: TeacherClassOption[] = (summaries ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
    student_count: c.student_count,
  }));
  return { classes, assigned: new Map((assigned ?? []).map((a) => [a.class_id, a.due_date])) };
}
