import "server-only";
import { generateText, type ModelMessage } from "ai";
import type { CourseLevel } from "@/types/supabase";
import { cacheableInstructions, resolveModel, type ResolvedModel } from "./providers";
import { neutraliseTags, renderPrompt } from "./prompts";
import { describeIssues, extractJson, generatedChunk, parseVisual, type GeneratedChunk } from "./schemas";

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
    maxRetries: 2, // network and rate-limit errors; bad output is retried below
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

/** One diagram for a module. The SVG is NOT sanitised here; callers must (src/lib/svg/sanitize.ts). */
export async function drawVisual(req: { language: string; heading: string; body: string }): Promise<AiResult<Visual | null>> {
  const m = resolveModel("visual");
  const { instructions, request } = renderPrompt("draw-visual", {
    language: languageName(req.language),
    heading: neutraliseTags(req.heading),
    body: neutraliseTags(req.body),
  });
  const res = await call(m, instructions, [{ role: "user", content: request }], 3_000, 90_000);
  return { data: parseVisual(res.text), usage: addUsage({ input: 0, output: 0 }, res.usage), provider: m.provider, model: m.modelId };
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

export { AiConfigError, isAiConfigured, dailyLimits, modelChoice } from "./config";
