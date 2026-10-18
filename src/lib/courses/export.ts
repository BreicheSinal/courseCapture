import type { ModuleRow } from "@/types/supabase";

/**
 * Export HTML (PRD FR-17, issue #34): one standalone page with the whole
 * course — no scripts, no external files, readable offline and in print.
 * Every piece of text is escaped; diagrams must already be sanitised.
 */
export type ExportModule = Pick<
  ModuleRow,
  | "position"
  | "heading"
  | "body"
  | "key_points"
  | "flashcards"
  | "quiz"
  | "visual_svg"
  | "visual_caption"
  | "visual_alt"
> & {
  answer: { answer_index: number; explanation: string } | null;
};

export type ExportLabels = {
  keyPoints: string;
  flashcards: string;
  quiz: string;
  showAnswer: string;
  module: (n: number, total: number) => string;
  footer: string;
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const RTL = new Set(["ar", "he", "fa", "ur"]);

export function buildCourseHtml(
  course: { title: string; locale: string },
  modules: ExportModule[],
  l: ExportLabels,
): string {
  const dir = RTL.has(course.locale) ? "rtl" : "ltr";
  const body = modules
    .map((m) => {
      const parts = [
        `<p class="eyebrow">${esc(l.module(m.position, modules.length))}</p>`,
        `<h2>${esc(m.heading)}</h2>`,
        m.body ? `<p>${esc(m.body).replace(/\n/g, "<br>")}</p>` : "",
        m.visual_svg
          ? `<figure><div role="img" aria-label="${esc(m.visual_alt ?? "")}">${m.visual_svg}</div>${
              m.visual_caption ? `<figcaption>${esc(m.visual_caption)}</figcaption>` : ""
            }</figure>`
          : "",
        m.key_points.length
          ? `<h3>${esc(l.keyPoints)}</h3><ul>${m.key_points.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>`
          : "",
        m.flashcards.length
          ? `<h3>${esc(l.flashcards)}</h3>${m.flashcards
              .map((c) => `<details class="card"><summary>${esc(c.q)}</summary><p>${esc(c.a)}</p></details>`)
              .join("")}`
          : "",
        m.quiz
          ? `<h3>${esc(l.quiz)}</h3><p>${esc(m.quiz.question)}</p><ol class="options">${m.quiz.options
              .map((o) => `<li>${esc(o)}</li>`)
              .join("")}</ol>${
              m.answer && m.quiz.options[m.answer.answer_index] !== undefined
                ? `<details><summary>${esc(l.showAnswer)}</summary><p><strong>${esc(m.quiz.options[m.answer.answer_index])}</strong>${
                    m.answer.explanation ? ` — ${esc(m.answer.explanation)}` : ""
                  }</p></details>`
                : ""
            }`
          : "",
      ];
      return `<section>${parts.join("")}</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${esc(course.locale)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(course.title)}</title>
<style>
:root{--bg:#fff;--ink:#1d1d1f;--muted:#68686d;--line:#d2d2d7;--accent:#0071e3;--soft:#f5f5f7;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#000;--ink:#f5f5f7;--muted:#a1a1a6;--line:#3a3a3c;--accent:#2997ff;--soft:#1c1c1e}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,"Noto Sans","Noto Sans Arabic",sans-serif}
main{max-width:46rem;margin:0 auto;padding:40px 16px 64px}
h1{font-size:34px;line-height:1.2;margin:0 0 32px}
h2{font-size:24px;line-height:1.25;margin:4px 0 12px}
h3{font-size:17px;margin:24px 0 8px}
section{padding:28px 0;border-top:1px solid var(--line)}
.eyebrow{margin:0;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent)}
figure{margin:16px 0;padding:12px;border:1px solid var(--line);border-radius:12px}
figure svg{display:block;max-width:100%;height:auto;margin-inline:auto;color:var(--ink)}
figcaption{color:var(--muted);font-size:15px;margin-top:8px}
ul,ol{padding-inline-start:1.4em}
details{margin:8px 0;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--soft)}
summary{cursor:pointer;font-weight:600}
footer{color:var(--muted);font-size:13px;margin-top:40px}
@media print{details{border:0;background:none;padding:0}details>*{display:block}section{break-inside:avoid-page}}
</style>
</head>
<body>
<main>
<h1>${esc(course.title)}</h1>
${body}
<footer>${esc(l.footer)}</footer>
</main>
</body>
</html>`;
}

/** A safe download name: ASCII for the plain header, the real title for filename*. */
export function exportFileName(title: string) {
  const ascii =
    title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60)
      .toLowerCase() || "course";
  return { ascii: `${ascii}.html`, utf8: encodeURIComponent(`${title.slice(0, 80)}.html`) };
}
