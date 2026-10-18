import type { jsPDF as JsPdf } from "jspdf";

export type CertificateLines = {
  heading: string;
  certifies: string;
  name: string;
  completed: string;
  details: string[];
  quizLabel: string;
  quiz: string;
};

const arabic = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
// Bidi marks and isolates: the PDF fonts have no glyph for them, and jsPDF's
// own bidi engine does the ordering instead.
const marks = /[‎‏؜‪-‮⁦-⁩]/g;

/** Strips the invisible direction marks Intl adds around dates and numbers. */
export function pdfText(text: string) {
  return text.replace(marks, "").replace(/\s+/g, " ").trim();
}

/**
 * Builds the certificate PDF (jsPDF + Noto fonts), in the browser so nothing
 * is stored. Each line picks the Arabic or Latin font from its own text, and
 * Arabic lines go through jsPDF's bidi engine as right-to-left logical text.
 */
export async function buildCertificatePdf(
  lines: CertificateLines,
  readFont: (file: string) => Promise<string>,
  load: () => Promise<{ jsPDF: typeof JsPdf }> = () => import("jspdf"),
) {
  const { jsPDF } = await load();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const fonts = [
    ["NotoSans-Regular.ttf", "Latin", "normal"],
    ["NotoSans-Bold.ttf", "Latin", "bold"],
    ["NotoSansArabic-Regular.ttf", "Arabic", "normal"],
    ["NotoSansArabic-Bold.ttf", "Arabic", "bold"],
  ] as const;
  const loaded = await Promise.all(fonts.map(([file]) => readFont(file)));
  fonts.forEach(([file, family, style], i) => {
    doc.addFileToVFS(file, loaded[i]);
    doc.addFont(file, family, style);
  });

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  // PDFs can't read CSS tokens: these RGB values mirror --accent and --ink(-muted) in Light
  // (documented exception, docs/design-system.md).
  doc.setDrawColor(0, 113, 227);
  doc.setLineWidth(3);
  doc.rect(28, 28, w - 56, h - 56);
  doc.setLineWidth(0.75);
  doc.rect(38, 38, w - 76, h - 76);

  const line = (raw: string, y: number, size: number, bold = false, grey = false) => {
    const text = pdfText(raw);
    if (!text) return;
    const rtl = arabic.test(text);
    doc.setFont(rtl ? "Arabic" : "Latin", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(grey ? 104 : 29, grey ? 104 : 29, grey ? 109 : 31);
    doc.text(text, w / 2, y, {
      align: "center",
      ...(rtl ? { isInputVisual: false, isOutputVisual: true, isInputRtl: true } : {}),
    } as Parameters<typeof doc.text>[3]);
  };
  line("CourseCapture", 92, 14, true);
  line(lines.heading, 160, 30, true);
  line(lines.certifies, 214, 15, false, true);
  line(lines.name, 262, 34, true);
  line(lines.completed, 312, 17);
  doc.setDrawColor(134, 134, 139);
  doc.line(w / 2 - 60, 344, w / 2 + 60, 344);
  // One fact per line keeps right-to-left and left-to-right runs apart.
  let y = 376;
  for (const d of lines.details) {
    line(d, y, 12, false, true);
    y += 20;
  }
  line(lines.quizLabel, y + 8, 12, false, true);
  line(lines.quiz, y + 28, 16, true);
  return doc;
}
