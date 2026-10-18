import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

/**
 * Reads uploaded sources into plain text (PRD FR-8, issue #29):
 * PDF text layer, PPTX slide text, TXT/MD. Scanned PDFs are detected here;
 * the job sends their first pages to a vision model (src/lib/ai).
 * Nothing in a file is ever treated as an instruction.
 */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024; // decision #25 / FR-8
export const MAX_PASTE_CHARS = 100_000;
export const SCAN_PAGE_LIMIT = 8;
export const CHUNK_CHARS = 12_000;
export const MAX_CHUNKS = 4;
export const MIN_TEXT_CHARS = 80;

export type SourceKind = "pdf" | "pptx" | "text";

const extensions: Record<string, SourceKind> = { pdf: "pdf", pptx: "pptx", txt: "text", md: "text", markdown: "text" };

/** The kind of file from its name, or null when we don't read that type. */
export function kindFromName(name: string): SourceKind | null {
  const ext = /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toLowerCase() ?? "";
  return extensions[ext] ?? null;
}

/** Checks the bytes really are what the name says (uploads are scanned for type, PRD §7). */
export function sniffKind(bytes: Uint8Array): SourceKind | null {
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (head.startsWith("%PDF-")) return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "pptx"; // ZIP; checked again on open
  if (looksLikeText(bytes)) return "text";
  return null;
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, 4096);
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample.length < bytes.length ? trimPartialUtf8(sample) : sample);
    return true;
  } catch {
    return false;
  }
}

// A 4 KB sample can end in the middle of a multi-byte character.
function trimPartialUtf8(b: Uint8Array): Uint8Array {
  let end = b.length;
  for (let i = 1; i <= 3 && end - i >= 0; i++) {
    const c = b[end - i];
    if ((c & 0xc0) === 0x80) continue;
    if (c >= 0xc0) end -= i;
    break;
  }
  return b.slice(0, end);
}

/** Tidies extracted text: no control characters, single spaces, at most one blank line in a row. */
export function normaliseText(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function readText(bytes: Uint8Array): string {
  return normaliseText(new TextDecoder("utf-8").decode(bytes));
}

export type PdfText = { text: string; pages: number; scannedPages: number; scanned: boolean };

/** PDF text layer, page by page. A PDF with (almost) no text is treated as a scan. */
export async function readPdf(bytes: Uint8Array): Promise<PdfText> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = text.map((p) => normaliseText(p));
  const scannedPages = pages.filter((p) => p.replace(/\s/g, "").length < 20).length;
  const joined = pages.filter(Boolean).join("\n\n");
  const scanned = joined.length < MIN_TEXT_CHARS || scannedPages >= Math.ceil(totalPages / 2);
  return { text: joined, pages: totalPages, scannedPages, scanned };
}

/** The first `limit` pages as a new PDF, for the vision model (FR-8: first 8 pages of a scan). */
export async function firstPages(bytes: Uint8Array, limit = SCAN_PAGE_LIMIT): Promise<{ pdf: Uint8Array; pages: number }> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const count = Math.min(source.getPageCount(), limit);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, Array.from({ length: count }, (_, i) => i));
  for (const p of copied) out.addPage(p);
  return { pdf: await out.save(), pages: count };
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return entities[e.toLowerCase()] ?? m;
  });
}

/** Slide text from a PPTX, in slide order; paragraphs within a slide on their own lines. */
export async function readPptx(bytes: Uint8Array): Promise<{ text: string; slides: number }> {
  const zip = await JSZip.loadAsync(bytes);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  if (!slideNames.length) throw new SourceError("not_pptx");
  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string");
    const paragraphs = xml.split(/<\/a:p>/).map((p) =>
      [...p.matchAll(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(""),
    );
    slides.push(paragraphs.map((p) => p.trim()).filter(Boolean).join("\n"));
  }
  return { text: normaliseText(slides.filter(Boolean).join("\n\n")), slides: slideNames.length };
}

/**
 * Splits text into at most `max` chunks of about `size` characters, on
 * paragraph breaks where possible (FR-10). Text past the last chunk is dropped.
 */
export function chunkText(text: string, size = CHUNK_CHARS, max = MAX_CHUNKS): { chunks: string[]; truncated: boolean } {
  const paragraphs = text.split(/\n\s*\n/).flatMap((p) => splitLong(p.trim(), size)).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > size) {
      chunks.push(current);
      current = "";
      if (chunks.length === max) return { chunks, truncated: true };
    }
    current = current ? `${current}\n\n${p}` : p;
  }
  if (current) chunks.push(current);
  return { chunks: chunks.slice(0, max), truncated: chunks.length > max };
}

function splitLong(p: string, size: number): string[] {
  if (p.length <= size) return [p];
  const parts: string[] = [];
  let rest = p;
  while (rest.length > size) {
    // Break at the last sentence end (or space) before the limit.
    const window = rest.slice(0, size);
    const cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("\n"), window.lastIndexOf("。"));
    const at = cut > size / 2 ? cut + 1 : window.lastIndexOf(" ") > size / 2 ? window.lastIndexOf(" ") : size;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** How many modules to ask for per chunk (FR-10). */
export const moduleRange = (chunks: number) => (chunks > 1 ? "3–5" : "3–7");

/** A problem with the source the teacher can act on; `code` is a translation key. */
export class SourceError extends Error {
  constructor(readonly code: "unsupported_type" | "too_large" | "not_pptx" | "unreadable" | "no_text" | "empty") {
    super(code);
  }
}
