"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/locales";
import { dailyLimits, isAiConfigured, modelChoice } from "@/lib/ai";
import { getSession } from "@/lib/auth/session";
import { kindFromName, MAX_PASTE_CHARS, MAX_SOURCE_BYTES, MIN_TEXT_CHARS } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";
import { isServiceConfigured, serviceClient, SOURCES_BUCKET } from "@/lib/supabase/service";
import type { CourseLevel, GenerationJobRow, JobStep } from "@/types/supabase";
import { queueGeneration } from "./queue";
import { removeSource } from "./run";

/**
 * T1 New course → T2 Generating. Files go from the browser straight to the
 * private `sources` bucket with a signed upload URL (Vercel can't take a
 * 20 MB request body); the server checks the caller before signing anything.
 * Errors come back as keys under `teacher.newCourse.errors.*`.
 */
export type NewCourseError =
  | "type"
  | "size"
  | "empty"
  | "tooShort"
  | "tooLong"
  | "notesTooLong"
  | "missingUpload"
  | "dailyLimit"
  | "notConfigured"
  | "notAllowed"
  | "generic";

const uuid = z.string().uuid();
const localeSchema = z.enum(locales).catch("en");
const levels = ["beginner", "intermediate", "advanced"] as const satisfies readonly CourseLevel[];

async function approvedTeacher() {
  const session = await getSession();
  if (!session || session.profile.role !== "teacher" || session.profile.status !== "approved") return null;
  return session;
}

/** Keeps a readable, storage-safe file name (the original name is stored separately). */
function storageName(name: string) {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "txt";
  const stem = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${stem || "source"}.${ext}`;
}

const folderOf = (teacherId: string, uploadId: string) => `${teacherId}/${uploadId}`;

export type UploadTicket =
  { ok: true; uploadId: string; signedUrl: string; contentType: string } | { ok: false; error: NewCourseError };

const contentTypes = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  text: "text/plain",
} as const;

/** Step 1 of an upload: checks the file's name and size and returns a one-time upload URL. */
export async function prepareUpload(input: { fileName: string; size: number }): Promise<UploadTicket> {
  const session = await approvedTeacher();
  if (!session) return { ok: false, error: "notAllowed" };
  if (!isServiceConfigured()) return { ok: false, error: "notConfigured" };
  const kind = kindFromName(String(input.fileName ?? ""));
  if (!kind) return { ok: false, error: "type" };
  const size = Number(input.size);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "empty" };
  if (size > MAX_SOURCE_BYTES) return { ok: false, error: "size" };

  const uploadId = randomUUID();
  const path = `${folderOf(session.userId, uploadId)}/${storageName(input.fileName)}`;
  const { data, error } = await serviceClient().storage.from(SOURCES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "generic" };
  after(() => sweepOldUploads(session.userId));
  return { ok: true, uploadId, signedUrl: data.signedUrl, contentType: contentTypes[kind] };
}

/** Removes uploads older than a day that no job still needs (an upload started but never generated). */
async function sweepOldUploads(teacherId: string) {
  try {
    const storage = serviceClient().storage.from(SOURCES_BUCKET);
    const { data: folders } = await storage.list(teacherId, { limit: 100 });
    if (!folders?.length) return;
    const { data: jobs } = await serviceClient()
      .from("generation_jobs")
      .select("source_path")
      .eq("teacher_id", teacherId)
      .not("source_path", "is", null);
    const keep = new Set((jobs ?? []).map((j) => j.source_path));
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const stale: string[] = [];
    for (const f of folders) {
      const { data: files } = await storage.list(`${teacherId}/${f.name}`, { limit: 10 });
      for (const file of files ?? []) {
        const path = `${teacherId}/${f.name}/${file.name}`;
        if (!keep.has(path) && file.created_at && Date.parse(file.created_at) < dayAgo) stale.push(path);
      }
    }
    if (stale.length) await storage.remove(stale);
  } catch (e) {
    console.error("[sources] sweep failed", e);
  }
}

export type StartState = { error?: NewCourseError; field?: "file" | "text" | "notes" } | undefined;

/** "Generate course": creates the draft course and its job, then goes to T2. */
export async function startGeneration(_prev: StartState, formData: FormData): Promise<StartState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const session = await approvedTeacher();
  if (!session) return { error: "notAllowed" };
  if (!isServiceConfigured()) return { error: "notConfigured" };

  const contentLocale = z.enum(locales).safeParse(formData.get("content_locale"));
  const level = z.enum(levels).safeParse(formData.get("level"));
  if (!contentLocale.success || !level.success) return { error: "generic" };
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 500) return { error: "notesTooLong", field: "notes" };
  const mode = formData.get("mode") === "paste" ? "paste" : "file";
  const classId = uuid.safeParse(formData.get("class"));

  const service = serviceClient();
  const storage = service.storage.from(SOURCES_BUCKET);
  let sourcePath: string;
  let sourceKind: GenerationJobRow["source_kind"];
  let sourceName: string | null = null;
  let title: string;
  const t = await getTranslations({ locale, namespace: "teacher.newCourse" });

  if (mode === "paste") {
    const text = String(formData.get("text") ?? "").trim();
    if (text.length < MIN_TEXT_CHARS) return { error: "tooShort", field: "text" };
    if (text.length > MAX_PASTE_CHARS) return { error: "tooLong", field: "text" };
    sourcePath = `${folderOf(session.userId, randomUUID())}/pasted.txt`;
    const { error } = await storage.upload(sourcePath, new Blob([text], { type: "text/plain" }), {
      contentType: "text/plain",
    });
    if (error) return { error: "generic" };
    sourceKind = "paste";
    const firstLine = text.split("\n")[0].trim();
    title = firstLine.length <= 80 ? firstLine : t("untitled");
  } else {
    const uploadId = uuid.safeParse(formData.get("upload"));
    const fileName = String(formData.get("file_name") ?? "").slice(0, 255);
    const kind = kindFromName(fileName);
    if (!uploadId.success || !kind) return { error: "missingUpload", field: "file" };
    const folder = folderOf(session.userId, uploadId.data);
    const name = storageName(fileName);
    const { data: files } = await storage.list(folder, { limit: 5 });
    const file = files?.find((f) => f.name === name);
    if (!file) return { error: "missingUpload", field: "file" };
    if (Number(file.metadata?.size ?? 0) > MAX_SOURCE_BYTES) return { error: "size", field: "file" };
    sourcePath = `${folder}/${name}`;
    sourceKind = kind;
    sourceName = fileName;
    title =
      fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .slice(0, 120) || t("untitled");
  }

  // Daily limit (decision #27). Counted even when the basic splitter ends up writing the course.
  let usageId: number | null = null;
  const ai = isAiConfigured("generate") ? modelChoice("generate") : null;
  const { data: claimed, error: claimError } = await service.rpc("claim_ai_use", {
    p_user: session.userId,
    p_kind: "generate",
    p_limit: dailyLimits().generate,
    p_provider: ai?.provider ?? "",
    p_model: ai?.modelId ?? "",
  });
  if (claimError) {
    await removeSource(sourcePath);
    return { error: claimError.message.includes("daily_limit") ? "dailyLimit" : "generic" };
  }
  usageId = claimed;

  // The course is created as the teacher, so RLS checks they're allowed to.
  const supabase = await createClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      teacher_id: session.userId,
      title,
      content_locale: contentLocale.data,
      level: level.data,
      source_name: sourceName,
    })
    .select("id")
    .single();
  if (courseError || !course) {
    // Nothing was generated, so the day's use is given back.
    if (usageId !== null) await service.from("ai_usage").delete().eq("id", usageId);
    await removeSource(sourcePath);
    return { error: "generic" };
  }
  const { data: job, error: jobError } = await service
    .from("generation_jobs")
    .insert({
      course_id: course.id,
      teacher_id: session.userId,
      source_kind: sourceKind,
      source_path: sourcePath,
      notes,
    })
    .select("id")
    .single();
  if (jobError || !job) {
    await supabase.from("courses").delete().eq("id", course.id);
    await removeSource(sourcePath);
    return { error: "generic" };
  }
  await queueGeneration({ jobId: job.id, usageId, teacherId: session.userId });
  redirect({
    href: `/teacher/courses/${course.id}/generating${classId.success ? `?class=${classId.data}` : ""}`,
    locale,
  });
}

export type JobStatus = {
  step: JobStep;
  chunksTotal: number;
  chunksDone: number;
  modulesTotal: number;
  modulesDrawn: number;
  pagesTotal: number | null;
  pagesScanned: number | null;
  fallbackChunks: number;
  error: string | null;
  canRetry: boolean;
  /** Percent for the bar: reading 10, writing up to 70, drawing up to 100. */
  percent: number;
};

/** A job that hasn't finished after this long has died (e.g. a timed-out inline run). */
const STALE_MS = 30 * 60 * 1000;
const running = (job: GenerationJobRow) => job.step !== "done" && job.step !== "failed";
const isStale = (job: GenerationJobRow) => running(job) && Date.parse(job.created_at) < Date.now() - STALE_MS;

/** Marks a dead job failed, so the teacher can try again and the course isn't stuck "generating". */
async function expireIfStale(job: GenerationJobRow): Promise<GenerationJobRow> {
  if (!isStale(job)) return job;
  const patch = { step: "failed" as const, error: "generic", finished_at: new Date().toISOString() };
  await serviceClient().from("generation_jobs").update(patch).eq("id", job.id).not("step", "in", "(done,failed)");
  return { ...job, ...patch };
}

/**
 * T2's view of a job. "Try again" needs a failed job whose file is still there, fewer than
 * MAX_ATTEMPTS tries, and a course that isn't assigned: a new run replaces every module, which
 * would take students' progress with it (the database refuses that too).
 */
export async function toJobStatus(job: GenerationJobRow, jobCount: number, courseStatus: string): Promise<JobStatus> {
  const ratio = (a: number, b: number) => (b > 0 ? Math.min(1, a / b) : 0);
  const percent =
    job.step === "done"
      ? 100
      : job.step === "drawing"
        ? 70 + Math.round(30 * ratio(job.modules_drawn, job.modules_total))
        : job.step === "writing"
          ? 10 + Math.round(60 * ratio(job.chunks_done, job.chunks_total))
          : job.step === "reading"
            ? 5
            : 0;
  return {
    step: job.step,
    chunksTotal: job.chunks_total,
    chunksDone: job.chunks_done,
    modulesTotal: job.modules_total,
    modulesDrawn: job.modules_drawn,
    pagesTotal: job.pages_total,
    pagesScanned: job.pages_scanned,
    fallbackChunks: job.fallback_chunks,
    error: job.error,
    canRetry: job.step === "failed" && Boolean(job.source_path) && jobCount < MAX_ATTEMPTS && courseStatus !== "assigned",
    percent,
  };
}

const MAX_ATTEMPTS = 4;

/** T2 polls this. Read as the teacher, so RLS decides. */
export async function getJobStatus(courseId: string): Promise<JobStatus | null> {
  const id = uuid.safeParse(courseId);
  if (!id.success) return null;
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("course_id", id.data)
    .order("created_at", { ascending: false })
    .limit(MAX_ATTEMPTS);
  if (!jobs?.length) return null;
  const { data: course } = await supabase.from("courses").select("status").eq("id", id.data).maybeSingle();
  return toJobStatus(await expireIfStale(jobs[0]), jobs.length, course?.status ?? "draft");
}

export type RetryState = { error?: NewCourseError } | undefined;

/** T2 "Try again": a new job on the same source. Retries don't count toward the daily limit. */
export async function retryGeneration(_prev: RetryState, formData: FormData): Promise<RetryState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const id = uuid.safeParse(formData.get("course"));
  const session = await approvedTeacher();
  if (!id.success || !session) return { error: "notAllowed" };
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("course_id", id.data)
    .order("created_at", { ascending: false })
    .limit(MAX_ATTEMPTS);
  const { data: course } = await supabase.from("courses").select("status").eq("id", id.data).maybeSingle();
  const last = jobs?.[0] ? await expireIfStale(jobs[0]) : null;
  if (!last || !course || !(await toJobStatus(last, jobs!.length, course.status)).canRetry) return { error: "generic" };
  const { data: job, error } = await serviceClient()
    .from("generation_jobs")
    .insert({
      course_id: id.data,
      teacher_id: session.userId,
      source_kind: last.source_kind,
      source_path: last.source_path,
      notes: last.notes,
    })
    .select("id")
    .single();
  if (error || !job) return { error: "generic" };
  // The old job no longer owns the file.
  await serviceClient().from("generation_jobs").update({ source_path: null }).eq("id", last.id);
  await queueGeneration({ jobId: job.id, usageId: null, teacherId: session.userId });
  redirect({ href: `/teacher/courses/${id.data}/generating`, locale });
}
