import type { StudentCourse } from "@/types/supabase";

/** Today as a calendar date (UTC, decision #41), for "overdue". */
export function todayIso(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

export function isOverdue(c: Pick<StudentCourse, "due_date" | "modules_done" | "module_count">, today: string) {
  return !!c.due_date && c.due_date < today && c.modules_done < c.module_count;
}

export function isComplete(c: Pick<StudentCourse, "modules_done" | "module_count">) {
  return c.module_count > 0 && c.modules_done >= c.module_count;
}

/** Where "Resume" goes: the first module not done yet (or the last one when all are done). */
export function resumePosition(modules: { position: number; done: boolean }[]): number | null {
  if (!modules.length) return null;
  return (modules.find((m) => !m.done) ?? modules[modules.length - 1]).position;
}
