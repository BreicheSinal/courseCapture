import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ClassCourseStat, ClassRow, ClassSummary, CourseRow, JobStep, RosterRow } from "@/types/supabase";

/**
 * Reads for the teacher screens. Everything goes through the signed-in
 * user's client, so RLS decides what comes back (docs/schema.md).
 */

export async function getClassSummaries(): Promise<ClassSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("teacher_class_summaries");
  return data ?? [];
}

/** One class plus its student count; null when it doesn't exist or isn't the caller's. */
export const getClass = cache(async (classId: string): Promise<(ClassRow & { student_count: number }) | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return null;
  const supabase = await createClient();
  const [{ data: cls }, { count }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", classId).maybeSingle(),
    supabase.from("class_members").select("student_id", { count: "exact", head: true }).eq("class_id", classId),
  ]);
  return cls ? { ...cls, student_count: count ?? 0 } : null;
});

export async function getClassCourses(classId: string): Promise<ClassCourseStat[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("class_course_stats", { p_class: classId });
  return data ?? [];
}

/** Students in a class (name and email only) with progress on one of its courses. */
export const getRoster = cache(async (classId: string, courseId: string | null): Promise<RosterRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("class_roster", { p_class: classId, p_course: courseId });
  return data ?? [];
});

export type StudentModule = { position: number; heading: string; done: boolean; quiz: "correct" | "incorrect" | null };

/** T12: one student's modules in one course, with their first quiz answer per module. */
export async function getStudentCourse(studentId: string, courseId: string): Promise<StudentModule[]> {
  const supabase = await createClient();
  const [{ data: modules }, { data: progress }, { data: attempts }] = await Promise.all([
    supabase.from("modules").select("id, position, heading").eq("course_id", courseId).order("position"),
    supabase.from("module_progress").select("module_id").eq("course_id", courseId).eq("student_id", studentId),
    supabase
      .from("quiz_attempts")
      .select("module_id, is_correct")
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .eq("is_first", true),
  ]);
  const done = new Set((progress ?? []).map((p) => p.module_id));
  const quiz = new Map((attempts ?? []).map((a) => [a.module_id, a.is_correct]));
  return (modules ?? []).map((m) => ({
    position: m.position,
    heading: m.heading,
    done: done.has(m.id),
    quiz: quiz.has(m.id) ? (quiz.get(m.id) ? "correct" : "incorrect") : null,
  }));
}

export type AnnouncementItem = { id: string; body: string; created_at: string; seen: number };

export async function getAnnouncements(classId: string): Promise<AnnouncementItem[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("announcements")
    .select("id, body, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!rows?.length) return [];
  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .in(
      "announcement_id",
      rows.map((r) => r.id),
    );
  const seen = new Map<string, number>();
  for (const r of reads ?? []) seen.set(r.announcement_id, (seen.get(r.announcement_id) ?? 0) + 1);
  return rows.map((r) => ({ ...r, seen: seen.get(r.id) ?? 0 }));
}

export type TeacherCourse = Pick<CourseRow, "id" | "title" | "status" | "updated_at"> & {
  module_count: number;
  classes: { name: string; section: string; due_date: string | null }[];
  /** Latest generation job: drives "Generating", "Failed" and where the card links. */
  job: { step: JobStep; percent: number } | null;
};

/** T16: every course the teacher owns, with the classes it's assigned to. */
export async function getTeacherCourses(teacherId: string): Promise<TeacherCourse[]> {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, status, updated_at")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });
  if (!courses?.length) return [];
  const ids = courses.map((c) => c.id);
  const [{ data: assignments }, { data: classes }, { data: modules }, { data: jobs }] = await Promise.all([
    supabase.from("course_assignments").select("course_id, class_id, due_date").in("course_id", ids),
    supabase.from("classes").select("id, name, section").eq("teacher_id", teacherId),
    supabase.from("modules").select("course_id").in("course_id", ids),
    supabase
      .from("generation_jobs")
      .select("course_id, step, chunks_done, chunks_total, modules_drawn, modules_total, created_at")
      .in("course_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  const latestJob = new Map<string, NonNullable<typeof jobs>[number]>();
  for (const j of jobs ?? []) if (!latestJob.has(j.course_id)) latestJob.set(j.course_id, j);
  const percent = (j: NonNullable<typeof jobs>[number]) =>
    j.step === "writing"
      ? 10 + Math.round((60 * j.chunks_done) / Math.max(1, j.chunks_total))
      : j.step === "drawing"
        ? 70 + Math.round((30 * j.modules_drawn) / Math.max(1, j.modules_total))
        : j.step === "reading"
          ? 5
          : j.step === "done"
            ? 100
            : 0;
  const classById = new Map((classes ?? []).map((c) => [c.id, c]));
  const moduleCount = new Map<string, number>();
  for (const m of modules ?? []) moduleCount.set(m.course_id, (moduleCount.get(m.course_id) ?? 0) + 1);
  return courses.map((c) => ({
    ...c,
    module_count: moduleCount.get(c.id) ?? 0,
    job: latestJob.has(c.id) ? { step: latestJob.get(c.id)!.step, percent: percent(latestJob.get(c.id)!) } : null,
    classes: (assignments ?? [])
      .filter((a) => a.course_id === c.id && classById.has(a.class_id))
      .map((a) => ({ ...classById.get(a.class_id)!, due_date: a.due_date })),
  }));
}
