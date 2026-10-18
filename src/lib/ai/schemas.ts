import { z } from "zod";

/**
 * Shapes the AI must return (ai/prompts/*.md), checked with Zod before
 * anything is stored (CLAUDE.md rule 6). Over-long text is cut to the
 * database limits rather than failing the whole course.
 */
const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim())
    .transform((s) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s));
const required = (max: number) => text(max).pipe(z.string().min(1));

const flashcard = z.object({ q: required(300), a: required(300) });

const quiz = z
  .object({
    question: required(300),
    options: z.array(required(200)).min(2).max(10),
    answer_index: z.coerce.number().int().min(0),
    explanation: text(600).optional().default(""),
  })
  .refine((q) => q.answer_index < q.options.length, { message: "answer_index points past the options", path: ["answer_index"] })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === q.options.length, {
    message: "options must be different",
    path: ["options"],
  });

export const generatedModule = z.object({
  heading: required(120),
  body: text(2000),
  key_points: z.array(required(300)).max(8).default([]),
  flashcards: z.array(flashcard).max(8).default([]),
  quiz: quiz.nullable().optional(),
  check: text(200).optional().default(""),
});

export const generatedChunk = z.object({
  title: required(120),
  modules: z.array(generatedModule).min(1).max(8),
});

export type GeneratedModule = z.output<typeof generatedModule>;
export type GeneratedChunk = z.output<typeof generatedChunk>;

/** Pulls the JSON object out of a model reply (tolerates code fences and stray prose). */
export function extractJson(reply: string): unknown {
  const unfenced = reply.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new SyntaxError("No JSON object in the reply");
  return JSON.parse(unfenced.slice(start, end + 1));
}

/** Short, readable reason for a retry prompt ("modules.0.quiz.answer_index: …"). */
export function describeIssues(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

/** One diagram reply: an <svg> plus CAPTION: and ALT: lines (ai/prompts/draw-visual.md). */
export function parseVisual(reply: string): { svg: string; caption: string; alt: string } | null {
  const svg = /<svg[\s\S]*?<\/svg>/i.exec(reply)?.[0];
  if (!svg) return null;
  const rest = reply.slice(reply.indexOf(svg) + svg.length);
  const line = (key: string) => new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, "im").exec(rest)?.[1]?.trim() ?? "";
  const caption = text(200).parse(line("CAPTION"));
  const alt = text(400).parse(line("ALT"));
  if (!alt) return null; // a diagram without alt text isn't stored (schema check, CLAUDE.md rule 7)
  return { svg, caption, alt };
}
