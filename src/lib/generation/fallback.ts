import type { GeneratedChunk, GeneratedModule } from "@/lib/ai/schemas";

/**
 * The basic paragraph splitter (PRD FR-13): used for a chunk when the AI is
 * unavailable or keeps returning bad output. It never invents content: each
 * module is a slice of the source, with no flashcards or quiz. The review
 * note is a marker the screens translate ("Written by the basic splitter").
 */
export const FALLBACK_NOTE = "@fallback";

const sentencesOf = (p: string) =>
  (p.match(/[^.!?。؟]+[.!?。؟]+|[^.!?。؟]+$/g) ?? [p]).map((s) => s.trim()).filter(Boolean);

function words(s: string, n: number) {
  const w = s.split(/\s+/).filter(Boolean);
  return w.slice(0, n).join(" ") + (w.length > n ? "…" : "");
}

export function splitChunk(text: string, maxModules = 5): GeneratedChunk {
  let paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let title = "";
  // A short first line without an end mark reads like a title.
  if (paragraphs.length > 1 && paragraphs[0].length <= 120 && !/[.!?:;]$/.test(paragraphs[0])) {
    title = paragraphs[0];
    paragraphs = paragraphs.slice(1);
  }
  if (!paragraphs.length) paragraphs = [text.trim()];

  // Group paragraphs evenly into at most maxModules modules.
  const groups = Math.min(maxModules, paragraphs.length);
  const per = Math.ceil(paragraphs.length / groups);
  const modules: GeneratedModule[] = [];
  for (let i = 0; i < paragraphs.length && modules.length < maxModules; i += per) {
    const part = paragraphs.slice(i, i + per).join(" ");
    const sentences = sentencesOf(part);
    modules.push({
      heading: words(sentences[0] ?? part, 6).slice(0, 120) || `Part ${modules.length + 1}`,
      body: sentences.slice(0, 4).join(" ").slice(0, 2000),
      key_points: sentences.slice(0, 3).map((s) => s.slice(0, 300)),
      flashcards: [],
      quiz: null,
      check: FALLBACK_NOTE,
    });
  }
  return { title: (title || modules[0]?.heading || "Course").slice(0, 120), modules };
}
