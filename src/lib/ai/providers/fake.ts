import "server-only";
import { MockLanguageModelV4 } from "ai/test";
import type { AiTask } from "../config";

/**
 * A stand-in model for local development and end-to-end tests
 * (AI_PROVIDER=fake). It writes predictable content from the prompt so the
 * whole generation flow runs without an API key. Refused in production
 * (src/lib/ai/config.ts). A source containing "[[fail]]" makes it fail, to
 * exercise the fallback splitter.
 */
const usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
});

function promptText(prompt: unknown): string {
  return JSON.stringify(prompt);
}

function between(text: string, tag: string): string {
  const m = new RegExp(`<${tag}>\\\\n?([\\s\\S]*?)\\\\n?</${tag}>`).exec(text);
  return (m?.[1] ?? "").replace(/\\n/g, "\n").replace(/\\"/g, '"');
}

function course(text: string) {
  const source = between(text, "source");
  if (source.includes("[[fail]]")) throw new Error("Fake model failure");
  const sentences = (source.match(/[^.!?\n]+[.!?]/g) ?? [source]).map((s) => s.trim()).filter(Boolean);
  const words = source.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 3).join(" ").replace(/[^\p{L}\p{N} ]/gu, "") || "Course";
  const modules = [0, 1, 2].map((i) => {
    const s = sentences[i % sentences.length] ?? "This module explains the source.";
    return {
      heading: `Part ${i + 1}: ${s.split(" ").slice(0, 4).join(" ")}`,
      body: `${s} ${sentences[(i + 1) % sentences.length] ?? ""}`.trim(),
      key_points: [s, `Key idea ${i + 1}`, `Remember part ${i + 1}`],
      flashcards: [
        { q: `What is part ${i + 1} about?`, a: s },
        { q: `Name one key idea from part ${i + 1}.`, a: `Key idea ${i + 1}` },
      ],
      quiz: {
        question: `Which statement matches part ${i + 1}?`,
        options: [s, "None of these", "Something unrelated", "All of the above"],
        answer_index: 0,
        explanation: "It is what the source says.",
      },
      check: i === 1 ? "Check the quiz options are clear." : "",
    };
  });
  return JSON.stringify({ title, modules });
}

function visual(text: string) {
  const heading = between(text, "module").split(":")[0]?.slice(0, 30) || "Idea";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">' +
    '<rect x="20" y="70" width="140" height="80" rx="12" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)"/>' +
    '<rect x="240" y="70" width="140" height="80" rx="12" fill="none" stroke="currentColor"/>' +
    '<path d="M165 110 H235" stroke="currentColor" stroke-width="2"/>' +
    `<text x="90" y="115" font-size="14" text-anchor="middle" fill="currentColor">${heading.replace(/[<&>"]/g, "")}</text>` +
    '<text x="310" y="115" font-size="14" text-anchor="middle" fill="currentColor">Result</text>' +
    "</svg>";
  return `${svg}\nCAPTION: How ${heading} leads to a result.\nALT: Two boxes joined by a line: ${heading} on the left, the result on the right.`;
}

const transcript =
  "Photosynthesis turns light into chemical energy. Chlorophyll absorbs red and blue light. " +
  "The Calvin cycle fixes carbon dioxide into sugar.";

export function fakeModel(task: AiTask, modelId: string) {
  return new MockLanguageModelV4({
    provider: "fake",
    modelId,
    doGenerate: async (options) => {
      const text = promptText(options.prompt);
      const out =
        task === "generate" ? course(text) : task === "visual" ? visual(text) : task === "transcribe" ? transcript : "A short, kind answer.";
      return {
        content: [{ type: "text", text: out }],
        finishReason: { unified: "stop", raw: undefined },
        usage: usage(Math.ceil(text.length / 4), Math.ceil(out.length / 4)),
        warnings: [],
      };
    },
  });
}
