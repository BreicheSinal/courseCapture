import "server-only";
import {
  AiConfigError,
  aiFailureKind,
  drawVisual,
  generateCourseChunk,
  InvalidOutputError,
  isAiConfigured,
  transcribeScan,
  type Usage,
} from "@/lib/ai";
import type { GeneratedChunk } from "@/lib/ai/schemas";
import {
  chunkText,
  firstPages,
  MIN_TEXT_CHARS,
  moduleRange,
  readPdf,
  readPptx,
  readText,
  sniffKind,
  SourceError,
} from "@/lib/parse";
import { serviceClient, SOURCES_BUCKET } from "@/lib/supabase/service";
import { sanitizeSvg } from "@/lib/svg/sanitize";
import type { CourseLevel, GenerationJobRow } from "@/types/supabase";
import { AI_REJECTED } from "./constants";
import { splitChunk } from "./fallback";

/**
 * Course generation (PRD FR-9–FR-13, docs/architecture.md → request trace).
 * Written as named steps so Inngest can retry each one on its own and keep
 * what earlier steps produced; the inline runner just runs them in order.
 * Progress goes to generation_jobs, which T2 shows.
 */
export type StepRunner = { run<T>(name: string, fn: () => Promise<T>): Promise<T> };

export type GenerationEvent = { jobId: string; usageId: number | null };

const MAX_MODULES = 24;
const DRAW_BATCH = 4;
const RTL = new Set(["ar", "he", "fa", "ur"]);

/** Error keys T2 knows how to explain (messages: teacher.generating.errors.*). */
export type JobErrorKey =
  | "unsupported_type"
  | "too_large"
  | "not_pptx"
  | "unreadable"
  | "no_text"
  | "scan_needs_ai"
  | "source_missing"
  | "generic";

type Context = {
  jobId: string;
  courseId: string;
  teacherId: string;
  kind: GenerationJobRow["source_kind"];
  path: string | null;
  notes: string;
  locale: string;
  level: CourseLevel;
  teacherLocale: string;
};

const db = () => serviceClient();

async function updateJob(
  jobId: string,
  patch: Partial<Omit<GenerationJobRow, "id" | "course_id" | "teacher_id" | "created_at">>,
) {
  const { error } = await db().from("generation_jobs").update(patch).eq("id", jobId);
  if (error) throw new Error(`Couldn't update job: ${error.message}`);
}

async function track(usageId: number | null, usage: Usage) {
  if (usageId === null) return;
  await db().rpc("add_ai_tokens", { p_use: usageId, p_input: usage.input, p_output: usage.output });
}

async function start(jobId: string): Promise<Context> {
  const { data: job, error } = await db().from("generation_jobs").select("*").eq("id", jobId).single();
  if (error || !job) throw new Error("Job not found");
  const [{ data: course }, { data: teacher }] = await Promise.all([
    db().from("courses").select("content_locale, level").eq("id", job.course_id).single(),
    db().from("profiles").select("ui_locale").eq("id", job.teacher_id).single(),
  ]);
  if (!course) throw new Error("Course not found");
  await updateJob(jobId, { step: "reading", started_at: new Date().toISOString(), error: null });
  return {
    jobId,
    courseId: job.course_id,
    teacherId: job.teacher_id,
    kind: job.source_kind,
    path: job.source_path,
    notes: job.notes,
    locale: course.content_locale,
    level: course.level,
    teacherLocale: teacher?.ui_locale ?? "en",
  };
}

/** Downloads and reads the source; scanned PDFs go to the vision model. Returns the chunks. */
async function read(ctx: Context, usageId: number | null) {
  if (!ctx.path) throw new SourceError("empty");
  const { data: blob, error } = await db().storage.from(SOURCES_BUCKET).download(ctx.path);
  if (error || !blob) throw new JobError("source_missing");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sniffed = sniffKind(bytes);
  const expected = ctx.kind === "paste" ? "text" : ctx.kind;
  if (sniffed !== expected) throw new SourceError("unsupported_type");

  let text = "";
  let pages: number | null = null;
  let scannedPages: number | null = null;
  if (expected === "pdf") {
    let pdf;
    try {
      pdf = await readPdf(bytes);
    } catch {
      throw new SourceError("unreadable");
    }
    pages = pdf.pages;
    scannedPages = pdf.scannedPages;
    text = pdf.text;
    if (pdf.scanned) {
      if (!isAiConfigured("transcribe")) throw new JobError("scan_needs_ai");
      const { pdf: firstEight, pages: sent } = await firstPages(bytes);
      const out = await transcribeScan(firstEight);
      await track(usageId, out.usage);
      text = readText(new TextEncoder().encode(out.data));
      scannedPages = Math.max(scannedPages, sent);
    }
  } else if (expected === "pptx") {
    try {
      const deck = await readPptx(bytes);
      text = deck.text;
      pages = deck.slides;
    } catch (e) {
      throw e instanceof SourceError ? e : new SourceError("unreadable");
    }
  } else {
    text = readText(bytes);
  }
  if (text.length < MIN_TEXT_CHARS) throw new SourceError("no_text");
  const { chunks, truncated } = chunkText(text);
  await updateJob(ctx.jobId, {
    step: "writing",
    pages_total: pages,
    pages_scanned: scannedPages,
    chunks_total: chunks.length,
    chunks_done: 0,
  });
  return { chunks, truncated };
}

/** One chunk → modules. Falls back to the basic splitter when the AI can't produce valid output (FR-13). */
async function write(ctx: Context, usageId: number | null, chunk: string, index: number, total: number) {
  let result: { data: GeneratedChunk; fallback: boolean };
  try {
    const out = await generateCourseChunk({
      text: chunk,
      language: ctx.locale,
      level: ctx.level,
      moduleRange: moduleRange(total),
      notes: ctx.notes,
      teacherLanguage: ctx.teacherLocale,
    });
    await track(usageId, out.usage);
    result = { data: out.data, fallback: false };
  } catch (e) {
    if (e instanceof InvalidOutputError) await track(usageId, e.usage);
    if (!(e instanceof AiConfigError)) console.error("[generation] chunk failed, using the basic splitter", e);
    if (aiFailureKind(e) === "rejected") await updateJob(ctx.jobId, { error: AI_REJECTED });
    result = { data: splitChunk(chunk, total > 1 ? 5 : 7), fallback: true };
  }
  await updateJob(ctx.jobId, { chunks_done: index + 1 });
  return result;
}

/** Replaces the course's modules with the generated ones (a retry starts clean). */
async function save(ctx: Context, parts: { data: GeneratedChunk; fallback: boolean }[]) {
  const modules = parts.flatMap((p) => p.data.modules).slice(0, MAX_MODULES);
  if (!modules.length) throw new SourceError("no_text");
  const client = db();
  const { error: delError } = await client.from("modules").delete().eq("course_id", ctx.courseId);
  if (delError) throw new Error(delError.message);
  const { data: rows, error } = await client
    .from("modules")
    .insert(
      modules.map((m, i) => ({
        course_id: ctx.courseId,
        position: i + 1,
        heading: m.heading,
        body: m.body,
        key_points: m.key_points,
        flashcards: m.flashcards,
        quiz: m.quiz ? { question: m.quiz.question, options: m.quiz.options } : null,
        review_note: m.check || null,
      })),
    )
    .select("id, position");
  if (error || !rows) throw new Error(error?.message ?? "Insert failed");
  const byPosition = new Map(rows.map((r) => [r.position, r.id]));
  const answers = modules.flatMap((m, i) =>
    m.quiz
      ? [{ module_id: byPosition.get(i + 1)!, answer_index: m.quiz.answer_index, explanation: m.quiz.explanation }]
      : [],
  );
  if (answers.length) {
    const { error: aError } = await client.from("quiz_answers").insert(answers);
    if (aError) throw new Error(aError.message);
  }
  const title = parts.find((p) => !p.fallback)?.data.title ?? parts[0]?.data.title;
  if (title) await client.from("courses").update({ title }).eq("id", ctx.courseId);
  const drawable = isAiConfigured("visual");
  await updateJob(ctx.jobId, {
    step: drawable ? "drawing" : "done",
    modules_total: rows.length,
    modules_drawn: 0,
    fallback_chunks: parts.filter((p) => p.fallback).length,
    ...(drawable ? {} : { finished_at: new Date().toISOString() }),
  });
  return { moduleIds: rows.sort((a, b) => a.position - b.position).map((r) => r.id), drawable };
}

/**
 * Draws diagrams for a batch of modules. A diagram that fails is left out, and
 * the reason is logged (job and module position only, no course text) so a
 * provider problem shows up in the logs (#62).
 */
async function draw(ctx: Context, usageId: number | null, ids: string[], doneBefore: number) {
  const client = db();
  const { data: mods } = await client.from("modules").select("id, position, heading, body").in("id", ids);
  const results = await Promise.allSettled(
    (mods ?? []).map(async (m) => {
      const out = await drawVisual({ language: ctx.locale, heading: m.heading, body: m.body });
      await track(usageId, out.usage);
      if (!out.data) return { position: m.position, miss: out.miss ?? "no_svg" };
      const svg = sanitizeSvg(out.data.svg, { idPrefix: `m${m.position}`, rtl: RTL.has(ctx.locale) });
      if (!svg) return { position: m.position, miss: "unsafe" };
      const { error } = await client
        .from("modules")
        .update({ visual_svg: svg, visual_caption: out.data.caption || null, visual_alt: out.data.alt })
        .eq("id", m.id);
      if (error) throw new Error(`save failed: ${error.message}`);
      return { position: m.position, miss: null };
    }),
  );
  results.forEach((r, i) => {
    const position = mods?.[i]?.position;
    if (r.status === "rejected") {
      console.warn(`[diagram] job ${ctx.jobId} module ${position}: ${aiFailureKind(r.reason)}`, r.reason);
    } else if (r.value.miss) {
      console.warn(`[diagram] job ${ctx.jobId} module ${position}: ${r.value.miss}`);
    }
  });
  await updateJob(ctx.jobId, { modules_drawn: doneBefore + ids.length });
}

async function finish(ctx: Context) {
  await removeSource(ctx.path);
  await updateJob(ctx.jobId, { step: "done", source_path: null, finished_at: new Date().toISOString() });
}

/** Deletes an uploaded source (decision #25: only the filename is kept). */
export async function removeSource(path: string | null) {
  if (path) await db().storage.from(SOURCES_BUCKET).remove([path]);
}

export async function runGeneration({ jobId, usageId }: GenerationEvent, step: StepRunner) {
  const ctx = await step.run("start", () => start(jobId));
  const { chunks } = await step.run("read", () => read(ctx, usageId));
  const parts: { data: GeneratedChunk; fallback: boolean }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    parts.push(await step.run(`write-${i + 1}`, () => write(ctx, usageId, chunks[i], i, chunks.length)));
  }
  const { moduleIds, drawable } = await step.run("save", () => save(ctx, parts));
  if (drawable) {
    for (let i = 0; i < moduleIds.length; i += DRAW_BATCH) {
      const batch = moduleIds.slice(i, i + DRAW_BATCH);
      await step.run(`draw-${i / DRAW_BATCH + 1}`, () => draw(ctx, usageId, batch, i));
    }
  }
  await step.run("finish", () => finish(ctx));
}

/** Marks a job failed with a key T2 can explain. The source stays, so "Try again" works. */
export async function failJob(jobId: string, error: unknown) {
  const key: JobErrorKey =
    error instanceof JobError ? error.key : error instanceof SourceError ? sourceKey(error) : "generic";
  if (key === "generic") console.error("[generation] job failed", error);
  await updateJob(jobId, { step: "failed", error: key, finished_at: new Date().toISOString() });
}

function sourceKey(e: SourceError): JobErrorKey {
  return e.code === "empty" ? "no_text" : e.code;
}

/** A failure the teacher can act on (wrong file, scanned without AI…). */
export class JobError extends Error {
  constructor(readonly key: JobErrorKey) {
    super(key);
  }
}

/** True when an error won't go away by retrying the step (Inngest stops retrying). */
export function isPermanent(error: unknown) {
  return error instanceof JobError || error instanceof SourceError;
}
