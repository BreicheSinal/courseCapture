import { describe, expect, it } from "vitest";
import { buildCourseHtml, exportFileName, type ExportLabels, type ExportModule } from "@/lib/courses/export";

const labels: ExportLabels = {
  keyPoints: "Key points",
  flashcards: "Flashcards",
  quiz: "Quick check",
  showAnswer: "Show the answer",
  module: (n, total) => `Module ${n} of ${total}`,
  footer: "Made with CourseCapture.",
};

const mod = (over: Partial<ExportModule> = {}): ExportModule => ({
  position: 1,
  heading: "Light <script>alert(1)</script>",
  body: "Plants & light.\nSecond line.",
  key_points: ['"Quoted"'],
  flashcards: [{ q: "Q?", a: "A." }],
  quiz: { question: "Which gas?", options: ["Oxygen", "Nitrogen"] },
  visual_svg: '<svg viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
  visual_caption: "Cap",
  visual_alt: 'A "box"',
  answer: { answer_index: 0, explanation: "Water splits." },
  ...over,
});

describe("HTML export", () => {
  it("escapes every piece of text and keeps the sanitised diagram", () => {
    const html = buildCourseHtml({ title: "Photo <b>", locale: "en" }, [mod()], labels);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Light &lt;script&gt;");
    expect(html).toContain("<title>Photo &lt;b&gt;</title>");
    expect(html).toContain("Plants &amp; light.<br>Second line.");
    expect(html).toContain('aria-label="A &quot;box&quot;"');
    expect(html).toContain('<svg viewBox="0 0 1 1">');
    expect(html).toContain("<strong>Oxygen</strong> — Water splits.");
  });

  it("has no scripts or external files, and right-to-left courses read that way", () => {
    const html = buildCourseHtml({ title: "ضوء", locale: "ar" }, [mod({ quiz: null, answer: null })], labels);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).not.toMatch(/<script|<link|src=|https?:/);
    expect(html).not.toContain(labels.showAnswer);
  });

  it("makes a safe file name", () => {
    expect(exportFileName("Photosynthesis: light & dark")).toEqual({
      ascii: "photosynthesis-light-dark.html",
      utf8: "Photosynthesis%3A%20light%20%26%20dark.html",
    });
    expect(exportFileName("التمثيل الضوئي").ascii).toBe("course.html");
  });
});
