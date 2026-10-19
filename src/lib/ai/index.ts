import "server-only";
import { APICallError, generateText, type ModelMessage } from "ai";
import type { CourseLevel } from "@/types/supabase";
import { cacheableInstructions, resolveModel, taskOptions, type ResolvedModel } from "./providers";
import { neutraliseTags, renderPrompt } from "./prompts";
import { describeIssues, extractJson, generatedChunk, readVisual, type GeneratedChunk, type VisualMiss } from "./schemas";

/**
 * The provider-agnostic AI layer (docs/ai.md). App code calls these
 * functions; which vendor and model answer comes from env (src/lib/ai/config.ts).
 * Everything the user supplied goes into the prompt as data, inside tags.
 */
export type Usage = { input: number; output: number };
export type AiResult<T> = { data: T; usage: Usage; provider: string; model: string };

const languageNames: Record<string, string> = { en: "English", ar: "Arabic", fr: "French", es: "Spanish" };
export const languageName = (code: string) => languageNames[code] ?? code;

const addUsage = (a: Usage, u: { inputTokens?: number; outputTokens?: number }): Usage => ({
  input: a.input + (u.inputTokens ?? 0),
  output: a.output + (u.outputTokens ?? 0),
});

async function call(m: ResolvedModel, instructions: string, messages: ModelMessage[], maxOutputTokens: number, timeoutMs: number) {
  return generateText({
    model: m.model,
    instructions: { role: "system", content: instructions, providerOptions: cacheableInstructions(m.provider) },
    messages,
    maxOutputTokens,
    providerOptions: taskOptions(m.provider, m.task),
    maxRetries: 2, // network and rate-limit errors (with backoff); bad output is retried below
    abortSignal: AbortSignal.timeout(timeoutMs),
  });
}

export type ChunkRequest = {
  text: string;
  language: string; // content locale code
  level: CourseLevel;
  moduleRange: string; // "3–5"
  notes: string;
  teacherLanguage: string; // UI locale code, for review notes
};

/**
 * One chunk of source text → title and modules. Asks for JSON, validates it,
 * and retries once with the validation error (docs/ai.md → Reliability).
 */
export async function generateCourseChunk(req: ChunkRequest): Promise<AiResult<GeneratedChunk>> {
  const m = resolveModel("generate");
  const { instructions, request } = renderPrompt("generate-course", {
    language: languageName(req.language),
    level: req.level,
    module_range: req.moduleRange,
    teacher_language: languageName(req.teacherLanguage),
    notes: neutraliseTags(req.notes) || "(none)",
    source_text: neutraliseTags(req.text),
  });
  const messages: ModelMessage[] = [{ role: "user", content: request }];
  let usage: Usage = { input: 0, output: 0 };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await call(m, instructions, messages, 12_000, 180_000);
    usage = addUsage(usage, res.usage);
    try {
      const data = generatedChunk.parse(extractJson(res.text));
      return { data, usage, provider: m.provider, model: m.modelId };
    } catch (e) {
      lastError = e;
      messages.push(
        { role: "assistant", content: res.text.slice(0, 20_000) },
        {
          role: "user",
          content: `That reply didn't match the required JSON shape (${describeIssues(e)}). Reply again with only the corrected JSON object.`,
        },
      );
    }
  }
  throw new InvalidOutputError(describeIssues(lastError), usage);
}

/** Reads scanned pages (a PDF of up to 8 pages) with a vision-capable model. */
export async function transcribeScan(pdf: Uint8Array): Promise<AiResult<string>> {
  const m = resolveModel("transcribe");
  const { instructions, request } = renderPrompt("transcribe-scan");
  const res = await call(
    m,
    instructions,
    [
      {
        role: "user",
        content: [
          { type: "text", text: request },
          { type: "file", data: pdf, mediaType: "application/pdf", filename: "pages.pdf" },
        ],
      },
    ],
    8_000,
    180_000,
  );
  return { data: res.text.trim(), usage: addUsage({ input: 0, output: 0 }, res.usage), provider: m.provider, model: m.modelId };
}

export type Visual = { svg: string; caption: string; alt: string };

/**
 * One diagram for a module. The SVG is NOT sanitised here; callers must (src/lib/svg/sanitize.ts).
 * A reply that was cut off or has no SVG or alt text is asked for once more.
 * `data` is null when there's still no usable diagram, and `miss` says why
 * (for logs; never shown to students).
 */
export async function drawVisual(req: {
  language: string;
  heading: string;
  body: string;
}): Promise<AiResult<Visual | null> & { miss?: VisualMiss }> {
  const m = resolveModel("visual");
  const { instructions, request } = renderPrompt("draw-visual", {
    language: languageName(req.language),
    heading: neutraliseTags(req.heading),
    body: neutraliseTags(req.body),
  });
  const messages: ModelMessage[] = [{ role: "user", content: request }];
  let usage: Usage = { input: 0, output: 0 };
  let miss: VisualMiss = "no_svg";
  for (let attempt = 0; attempt < 2; attempt++) {
    // Room for a ~2,500-character SVG, the two lines, and any thinking the model does first.
    const res = await call(m, instructions, messages, 8_000, 90_000);
    usage = addUsage(usage, res.usage);
    const read = readVisual(res.text);
    if (read.ok) return { data: read.data, usage, provider: m.provider, model: m.modelId };
    miss = res.finishReason === "length" ? "cut_off" : read.miss;
    messages.push(
      { role: "assistant", content: res.text.slice(0, 6_000) },
      {
        role: "user",
        content:
          miss === "cut_off"
            ? "That reply was cut off. Reply again with a shorter SVG (under 2500 characters), then the CAPTION: and ALT: lines."
            : "Reply again with only the <svg> element, then a line starting CAPTION: and a line starting ALT:, as plain text.",
      },
    );
  }
  return { data: null, miss, usage, provider: m.provider, model: m.modelId };
}

/**
 * How a failed model call went wrong, for logs and for the teacher's notice:
 * the provider refused the key (401/403), it was over its rate limit (429,
 * after the SDK's own retries), or something else.
 */
export function aiFailureKind(e: unknown): "rejected" | "rate_limited" | "other" {
  if (APICallError.isInstance(e)) {
    if (e.statusCode === 401 || e.statusCode === 403) return "rejected";
    if (e.statusCode === 429) return "rate_limited";
  }
  return "other";
}

/** The model kept returning output that doesn't match the schema. Carries the tokens it used. */
export class InvalidOutputError extends Error {
  constructor(
    message: string,
    readonly usage: Usage,
  ) {
    super(message);
  }
}

export { AiConfigError, isAiConfigured, dailyLimits, detectProvider, modelChoice } from "./config";
export type { VisualMiss } from "./schemas";
