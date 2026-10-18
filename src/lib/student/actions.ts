"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import type { QuizResult } from "@/types/supabase";

/**
 * Student actions. Each calls a database function that checks the caller is
 * an approved student who can see the course (docs/schema.md).
 */
const localeSchema = z.enum(locales).catch("en");
const uuid = z.string().uuid();

export type JoinState = { error?: "invalidCode" | "notFound" | "rateLimited" | "generic"; code?: string } | undefined;

/** S1 · "Join". Codes are 5 characters from the no-look-alikes alphabet; case, spaces and dashes are ignored. */
export async function joinClass(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const raw = String(formData.get("code") ?? "");
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-HJ-NP-Z2-9]{5}$/.test(code)) return { error: "invalidCode", code: raw };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_class", { p_code: code });
  if (error) return { error: error.message.includes("rate_limited") ? "rateLimited" : "generic", code: raw };
  const joined = data?.[0];
  if (!joined) return { error: "notFound", code: raw };
  redirect({ href: `/student/classes/${joined.class_id}?joined=1`, locale });
}

/** S4 · picking an answer. The first answer counts; the result says what was right. */
export async function answerQuiz(moduleId: string, choice: number): Promise<QuizResult | null> {
  const id = uuid.safeParse(moduleId);
  const pick = z.number().int().min(0).max(9).safeParse(choice);
  if (!id.success || !pick.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("answer_quiz", { p_module: id.data, p_choice: pick.data });
  if (error || !data?.[0]) return null;
  return data[0];
}

export type CompleteState = { error?: "generic" | "quizFirst" } | undefined;

/** S3/S4 · "Complete & next": record the module, then go to the next one or the finish screen. */
export async function completeModule(_prev: CompleteState, formData: FormData): Promise<CompleteState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const moduleId = uuid.safeParse(formData.get("module"));
  const next = z.coerce.number().int().min(1).max(500).safeParse(formData.get("next"));
  if (!moduleId.success) return { error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_module", { p_module: moduleId.data });
  const result = data?.[0];
  if (error || !result) return { error: error?.message.includes("quiz_first") ? "quizFirst" : "generic" };
  // The course comes from the database, not the form.
  const base = `/student/courses/${result.course_id}`;
  if (result.done >= result.total) redirect({ href: `${base}/finish`, locale });
  redirect({ href: next.success ? `${base}/modules/${next.data}` : base, locale });
}

/** S2/S7 · announcements shown on screen are marked seen (feeds "seen by" for the teacher). */
export async function markAnnouncementsSeen(ids: string[]): Promise<void> {
  const valid = z.array(uuid).max(50).safeParse(ids);
  if (!valid.success || valid.data.length === 0) return;
  const supabase = await createClient();
  // Skips ids outside the student's classes instead of failing the whole batch.
  await supabase.rpc("mark_announcements_seen", { p_ids: valid.data });
}
