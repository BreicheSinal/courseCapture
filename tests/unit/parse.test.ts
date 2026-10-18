import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  chunkText,
  firstPages,
  kindFromName,
  moduleRange,
  normaliseText,
  readPdf,
  readPptx,
  readText,
  sniffKind,
} from "@/lib/parse";
import { FALLBACK_NOTE, splitChunk } from "@/lib/generation/fallback";

async function pdfWith(pages: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pages) {
    const page = doc.addPage([600, 800]);
    if (text) page.drawText(text, { x: 40, y: 700, size: 12, font });
  }
  return doc.save();
}

async function pptxWith(slides: string[][]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  // Numbered out of order on purpose: slide10 must come after slide2.
  const numbers = slides.map((_, i) => (i === 1 ? 10 : i + 1));
  slides.forEach((paras, i) => {
    const body = paras.map((p) => `<a:p><a:r><a:t>${p}</a:t></a:r></a:p>`).join("");
    zip.file(
      `ppt/slides/slide${numbers[i]}.xml`,
      `<p:sld><p:cSld><p:spTree><p:sp><p:txBody>${body}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
    );
  });
  zip.file("ppt/slides/_rels/slide1.xml.rels", "<Relationships/>");
  return zip.generateAsync({ type: "uint8array" });
}

describe("file types", () => {
  it("reads the kind from the name", () => {
    expect(kindFromName("Paper.PDF")).toBe("pdf");
    expect(kindFromName("deck.pptx")).toBe("pptx");
    expect(kindFromName("notes.md")).toBe("text");
    expect(kindFromName("x.docx")).toBeNull();
    expect(kindFromName("noext")).toBeNull();
  });

  it("checks the bytes", async () => {
    expect(sniffKind(await pdfWith(["Hi"]))).toBe("pdf");
    expect(sniffKind(await pptxWith([["Hi"]]))).toBe("pptx");
    expect(sniffKind(new TextEncoder().encode("Plain text, ça va — مرحبا"))).toBe("text");
    expect(sniffKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]))).toBeNull(); // PNG
  });
});

describe("text", () => {
  it("normalises whitespace and control characters", () => {
    expect(normaliseText("﻿a\r\n\r\n\r\n\r\nb\u0007  c\t d ")).toBe("a\n\nb c d");
    expect(readText(new TextEncoder().encode("  Title \n\nBody  "))).toBe("Title\n\nBody");
  });
});

describe("PDF", () => {
  it("reads the text layer page by page", async () => {
    const r = await readPdf(
      await pdfWith([
        "Photosynthesis turns light into chemical energy in plants.",
        "Chlorophyll absorbs red and blue light in the chloroplasts.",
      ]),
    );
    expect(r.pages).toBe(2);
    expect(r.scanned).toBe(false);
    expect(r.text).toContain("Chlorophyll absorbs");
    expect(r.text.split("\n\n")).toHaveLength(2);
  });

  it("treats a PDF without text as scanned", async () => {
    const r = await readPdf(await pdfWith(["", "", ""]));
    expect(r).toMatchObject({ pages: 3, scannedPages: 3, scanned: true });
  });

  it("keeps the first 8 pages of a scan for the vision model", async () => {
    const { pdf, pages } = await firstPages(await pdfWith(Array(11).fill("")));
    expect(pages).toBe(8);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(8);
  });
});

describe("PPTX", () => {
  it("reads slides in number order with entities decoded", async () => {
    const r = await readPptx(await pptxWith([["Intro", "Plants &amp; light"], ["Ten"], ["Three"]]));
    expect(r.slides).toBe(3);
    expect(r.text).toBe("Intro\nPlants & light\n\nThree\n\nTen");
  });

  it("refuses a ZIP that isn't a deck", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w/>");
    await expect(readPptx(await zip.generateAsync({ type: "uint8array" }))).rejects.toThrow("not_pptx");
  });
});

describe("chunking", () => {
  it("keeps short text in one chunk", () => {
    expect(chunkText("One.\n\nTwo.")).toEqual({ chunks: ["One.\n\nTwo."], truncated: false });
  });

  it("packs paragraphs into chunks of about the size, at most four", () => {
    const para = "Sentence one is here. ".repeat(20).trim(); // ~440 chars
    const { chunks, truncated } = chunkText(Array(40).fill(para).join("\n\n"), 2000, 4);
    expect(chunks).toHaveLength(4);
    expect(truncated).toBe(true);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(2000);
  });

  it("splits a paragraph longer than a chunk at a sentence end", () => {
    const long = "A short sentence here. ".repeat(100);
    const { chunks } = chunkText(long, 500, 4);
    expect(chunks[0].endsWith(".")).toBe(true);
    expect(chunks[0].length).toBeLessThanOrEqual(500);
  });

  it("asks for fewer modules per chunk when there are several", () => {
    expect(moduleRange(1)).toBe("3–7");
    expect(moduleRange(3)).toBe("3–5");
  });
});

describe("basic splitter", () => {
  it("uses a short first line as the title and makes modules from paragraphs", () => {
    const r = splitChunk(
      "Photosynthesis\n\nPlants use light. They make sugar.\n\nChlorophyll is green. It absorbs light.\n\nThe Calvin cycle fixes carbon.",
    );
    expect(r.title).toBe("Photosynthesis");
    expect(r.modules).toHaveLength(3);
    expect(r.modules[0]).toMatchObject({
      heading: "Plants use light.",
      key_points: ["Plants use light.", "They make sugar."],
      quiz: null,
      check: FALLBACK_NOTE,
    });
  });

  it("never makes more than the maximum", () => {
    expect(splitChunk(Array(20).fill("A paragraph.").join("\n\n"), 5).modules).toHaveLength(5);
  });
});
