"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/locales";
import { dailyLimits, drawVisual, isAiConfigured, modelChoice } from "@/lib/ai";
import { getSession } from "@/lib/auth/session";
import { removeSource } from "@/lib/generation/run";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { sanitizeSvg } from "@/lib/svg/sanitize";
import { RTL_LOCALES } from "./queries";

/**
 * Teacher edits on a generated course (T3, T4, T5). Each one runs as the
 * teacher: RLS or a database function checks they own the course. Diagrams
 * are the only thing written with the service role, after the server
 * sanitises the SVG. Errors are keys under `teacher.review.errors.*`.
 */
export type CourseErrorKey =
  | "titleRequired"
  | "titleTooLong"
  | "headingRequired"
  | "answerRequired"
  | "optionsRequired"
  | "altRequired"
  | "lastModule"
  | "dailyLimit"
  | "noAi"
  | "drawFailed"
  | "stillGenerating"
  | "noModules"
  | "dueDate"
  | "generic";

const uuid = z.string().uuid();
const localeSchema = z.enum(locales).catch("en");

function errorKey(message: string | undefined): CourseErrorKey {
  const m = message ?? "";
  if (m.includes("invalid_heading")) return "headingRequired";
  if (m.includes("invalid_answer")) return "answerRequired";
  if (m.includes("invalid_quiz")) return "optionsRequired";
  if (m.includes("alt_required")) return "altRequired";
  if (m.includes("last_module")) return "lastModule";
  if (m.includes("still_generating")) return "stillGenerating";
  if (m.includes("no_modules")) return "noModules";
  if (m.includes("invalid_due_date")) return "dueDate";
  return "generic";
}

export type RenameState = { error?: CourseErrorKey; saved?: number } | undefined;

/** T3 · "Save title". */
export async function renameCourse(prev: RenameState, formData: FormData): Promise<RenameState> {
  const id = uuid.safeParse(formData.get("course"));
  const title = String(formData.get("title") ?? "").trim();
  if (!id.success) return { error: "generic" };
  if (!title) return { error: "titleRequired" };
  if ([...title].length > 120) return { error: "titleTooLong" };
  const supabase = await createClient();
  const { error, count } = await supabase.from("courses").update({ title }, { count: "exact" }).eq("id", id.data);
  if (error || count !== 1) return { error: "generic" };
  refresh();
  return { saved: (prev?.saved ?? 0) + 1 };
}

/** T3 · "Move up" / "Move down". Returns false when nothing changed. */
export async function moveModule(moduleId: string, offset: 1 | -1): Promise<boolean> {
  const id = uuid.safeParse(moduleId);
  if (!id.success || (offset !== 1 && offset !== -1)) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_module", { p_module: id.data, p_offset: offset });
  if (error) return false;
  refresh();
  return true;
}

const card = z.object({ q: z.string().max(300), a: z.string().max(300) });
const editorPayload = z.object({
  heading: z.string().max(120),
  body: z.string().max(2000),
  key_points: z.array(z.string().max(300)).max(8),
  flashcards: z.array(card).max(8),
  quiz: z
    .object({
      question: z.string().max(300),
      options: z.array(z.string().max(200)).max(10),
      answer_index: z.number().int().min(-1).max(9),
      explanation: z.string().max(600),
    })
    .nullable(),
  caption: z.string().max(200),
  alt: z.string().max(400),
});
export type EditorPayload = z.infer<typeof editorPayload>;

export type SaveState = { error?: CourseErrorKey; saved?: number } | undefined;

/**
 * T4 · "Save changes" and "Mark as checked" (intent=check, which also saves
 * and then opens the next module that still needs a check).
 */
export async function saveModule(prev: SaveState, formData: FormData): Promise<SaveState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const moduleId = uuid.safeParse(formData.get("module"));
  const courseId = uuid.safeParse(formData.get("course"));
  let payload: EditorPayload;
  try {
    payload = editorPayload.parse(JSON.parse(String(formData.get("payload") ?? "")));
  } catch {
    return { error: "generic" };
  }
  if (!moduleId.success || !courseId.success) return { error: "generic" };
  if (!payload.heading.trim()) return { error: "headingRequired" };

  let quiz: { question: string; options: string[] } | null = null;
  let answer: number | null = null;
  if (payload.quiz) {
    const options = payload.quiz.options.map((o) => o.trim());
    const filled = options.filter(Boolean);
    if (!payload.quiz.question.trim() || filled.length < 2) return { error: "optionsRequired" };
    const picked = payload.quiz.answer_index;
    if (picked < 0 || !options[picked]) return { error: "answerRequired" };
    // Drop empty options, keeping the right answer's index in step.
    answer = options.slice(0, picked).filter(Boolean).length;
    quiz = { question: payload.quiz.question.trim(), options: filled };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_module", {
    p_module: moduleId.data,
    p_heading: payload.heading,
    p_body: payload.body,
    p_key_points: payload.key_points,
    p_flashcards: payload.flashcards,
    p_quiz: quiz,
    p_answer_index: answer,
    p_explanation: payload.quiz?.explanation ?? "",
    p_caption: payload.caption,
    p_alt: payload.alt,
  });
  if (error) return { error: errorKey(error.message) };

  if (formData.get("intent") === "check") {
    const { error: checkError } = await supabase.rpc("set_module_checked", {
      p_module: moduleId.data,
      p_checked: true,
    });
    if (checkError) return { error: "generic" };
    const { data: next } = await supabase
      .from("modules")
      .select("position")
      .eq("course_id", courseId.data)
      .is("checked_at", null)
      .order("position")
      .limit(1);
    redirect({
      href: next?.[0]
        ? `/teacher/courses/${courseId.data}/modules/${next[0].position}/edit`
        : `/teacher/courses/${courseId.data}/review?checked=1`,
      locale,
    });
  }
  refresh();
  return { saved: (prev?.saved ?? 0) + 1 };
}

/** T4 · "Mark as not checked". */
export async function uncheckModule(moduleId: string): Promise<boolean> {
  const id = uuid.safeParse(moduleId);
  if (!id.success) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_module_checked", { p_module: id.data, p_checked: false });
  if (error) return false;
  refresh();
  return true;
}

export type VisualState = { error?: CourseErrorKey; drawn?: number } | undefined;

/** T4 · "Regenerate diagram" (or draw one). Counts toward the daily diagram limit. */
export async function redrawVisual(prev: VisualState, formData: FormData): Promise<VisualState> {
  const moduleId = uuid.safeParse(formData.get("module"));
  const session = await getSession();
  if (!moduleId.success || !session || session.profile.role !== "teacher" || session.profile.status !== "approved")
    return { error: "generic" };
  if (!isAiConfigured("visual")) return { error: "noAi" };

  // Read as the teacher: no row means it isn't theirs.
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("id, position, heading, body, course_id")
    .eq("id", moduleId.data)
    .maybeSingle();
  if (!mod) return { error: "generic" };
  const { data: course } = await supabase
    .from("courses")
    .select("content_locale")
    .eq("id", mod.course_id)
    .maybeSingle();
  if (!course) return { error: "generic" };

  const service = serviceClient();
  const choice = modelChoice("visual");
  const { data: useId, error: claimError } = await service.rpc("claim_ai_use", {
    p_user: session.userId,
    p_kind: "redraw",
    p_limit: dailyLimits().redraw,
    p_provider: choice.provider,
    p_model: choice.modelId,
  });
  if (claimError) return { error: claimError.message.includes("daily_limit") ? "dailyLimit" : "generic" };

  try {
    const out = await drawVisual({ language: course.content_locale, heading: mod.heading, body: mod.body });
    await service.rpc("add_ai_tokens", { p_use: useId, p_input: out.usage.input, p_output: out.usage.output });
    const svg =
      out.data &&
      sanitizeSvg(out.data.svg, { idPrefix: `m${mod.position}`, rtl: RTL_LOCALES.has(course.content_locale) });
    if (!svg || !out.data) return { error: "drawFailed" };
    const { error } = await service
      .from("modules")
      .update({ visual_svg: svg, visual_caption: out.data.caption || null, visual_alt: out.data.alt })
      .eq("id", mod.id);
    if (error) return { error: "generic" };
  } catch (e) {
    console.error("[diagram] redraw failed", e);
    return { error: "drawFailed" };
  }
  refresh();
  return { drawn: (prev?.drawn ?? 0) + 1 };
}

/** T4 · "Remove diagram" (second press). */
export async function removeVisual(moduleId: string): Promise<boolean> {
  const id = uuid.safeParse(moduleId);
  if (!id.success) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_module_visual", { p_module: id.data });
  if (error) return false;
  refresh();
  return true;
}

export type DeleteModuleState = { error?: CourseErrorKey } | undefined;

/** T4 · "Delete module" (second press). Goes back to the review list. */
export async function deleteModule(_prev: DeleteModuleState, formData: FormData): Promise<DeleteModuleState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const moduleId = uuid.safeParse(formData.get("module"));
  const courseId = uuid.safeParse(formData.get("course"));
  if (!moduleId.success || !courseId.success) return { error: "generic" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_module", { p_module: moduleId.data });
  if (error) return { error: errorKey(error.message) };
  redirect({ href: `/teacher/courses/${courseId.data}/review?moduleDeleted=1`, locale });
}

export type AssignState = { error?: CourseErrorKey; className?: string } | undefined;

/**
 * T5 · "Assign": every ticked class gets the course with its own due date
 * (decision #28); classes that were assigned and are now unticked lose it.
 */
export async function saveAssignments(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const courseId = uuid.safeParse(formData.get("course"));
  if (!courseId.success) return { error: "generic" };
  const ticked = formData
    .getAll("class")
    .map(String)
    .filter((c) => uuid.safeParse(c).success);
  const before = formData
    .getAll("was")
    .map(String)
    .filter((c) => uuid.safeParse(c).success);
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const supabase = await createClient();
  for (const classId of ticked) {
    const due = String(formData.get(`due_${classId}`) ?? "");
    const { error } = await supabase.rpc("assign_course", {
      p_course: courseId.data,
      p_class: classId,
      p_due: date.test(due) ? due : null,
    });
    if (error) return { error: errorKey(error.message), className: classId };
  }
  for (const classId of before.filter((c) => !ticked.includes(c))) {
    const { error } = await supabase.rpc("unassign_course", { p_course: courseId.data, p_class: classId });
    if (error) return { error: "generic" };
  }
  const only = ticked.length === 1 && before.length === 0 ? ticked[0] : null;
  redirect({
    href: only
      ? `/teacher/classes/${only}?assigned=${courseId.data}`
      : `/teacher/courses/${courseId.data}/review?assigned=${ticked.length}`,
    locale,
  });
}

export type DeleteCourseState = { error?: CourseErrorKey } | undefined;

/** T3 menu · "Delete course" (second press). Students lose it; their progress goes with it. */
export async function deleteCourse(_prev: DeleteCourseState, formData: FormData): Promise<DeleteCourseState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const id = uuid.safeParse(formData.get("course"));
  if (!id.success) return { error: "generic" };
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("generation_jobs").select("source_path").eq("course_id", id.data);
  const { error, count } = await supabase.from("courses").delete({ count: "exact" }).eq("id", id.data);
  if (error || count !== 1) return { error: "generic" };
  // Any source still kept for "Try again" goes too (decision #25).
  for (const j of jobs ?? []) await removeSource(j.source_path).catch(() => null);
  redirect({ href: "/teacher/courses?deleted=1", locale });
}
