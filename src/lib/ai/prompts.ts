import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads a prompt from ai/prompts/*.md at runtime (decision #12). Text above
 * `---8<---` is the fixed, cacheable instruction part; text below is the
 * per-request part. `{{name}}` placeholders are filled from `vars`.
 * next.config.ts ships the folder with the server functions.
 */
export type PromptName = "generate-course" | "transcribe-scan" | "draw-visual" | "tutor";

const cache = new Map<PromptName, string>();

function load(name: PromptName): string {
  let text = cache.get(name);
  if (text === undefined) {
    text = readFileSync(join(process.cwd(), "ai", "prompts", `${name}.md`), "utf8");
    cache.set(name, text);
  }
  return text;
}

/** Removes the tags we use as data delimiters, so source text can't close them early. */
export function neutraliseTags(value: string): string {
  return value.replace(/<\/?\s*(source|notes|module|question)\b[^>]*>/gi, "");
}

export function renderPrompt(name: PromptName, vars: Record<string, string> = {}) {
  const fill = (part: string) =>
    part.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (!(key in vars)) throw new Error(`Prompt ${name} needs {{${key}}}`);
      return vars[key];
    });
  const [instructions, request = ""] = load(name).split(/^---8<---\s*$/m);
  return { instructions: fill(instructions).trim(), request: fill(request).trim() };
}
