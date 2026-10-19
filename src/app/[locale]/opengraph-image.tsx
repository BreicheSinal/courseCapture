import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import tokens from "../../../design-system/tokens.json";

/**
 * Social preview (#59): one neutral image for every language — the Cover bands,
 * the wordmark and two real screens (Light). No sentence on it, so it reads the
 * same in English, Arabic, French and Spanish; the title and description come
 * from each page's metadata.
 */
export const alt = "CourseCapture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const color = (name: string) => tokens.color.tokens.find((c) => c.name === name)!.value.light;

// Literal paths (not process.cwd()), so the build traces only these files.
const png = async (url: URL) => `data:image/png;base64,${(await readFile(url)).toString("base64")}`;

export default async function Image() {
  const [bold, review, reader] = await Promise.all([
    readFile(new URL("../../../public/fonts/NotoSans-Bold.ttf", import.meta.url)),
    png(new URL("../../../public/marketing/og/review.png", import.meta.url)),
    png(new URL("../../../public/marketing/og/reader.png", import.meta.url)),
  ]);
  const band = (x: number, w: number, h: number, c: string) => (
    <div style={{ position: "absolute", left: x, top: -24, width: w, height: h + 24, borderRadius: 26, background: c }} />
  );
  const phone = (src: string, top: number) => (
    <div
      style={{
        display: "flex",
        padding: 10,
        borderRadius: 36,
        background: color("surface"),
        border: `2px solid ${color("line")}`,
        marginTop: top,
      }}
    >
      <img src={src} width={210} height={454} style={{ borderRadius: 26 }} alt="" />
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: color("bg"), position: "relative", overflow: "hidden" }}>
        {band(-26, 546, 150, color("accent"))}
        {band(560, 265, 128, color("ink"))}
        {band(846, 160, 118, color("accent-soft"))}
        {band(1026, 104, 104, color("success"))}
        {band(1150, 140, 84, color("warning"))}
        <div style={{ position: "absolute", left: 72, top: 290, display: "flex", fontFamily: "Noto Sans", fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
          <span style={{ color: color("ink") }}>Course</span>
          <span style={{ color: color("accent-text") }}>Capture</span>
        </div>
        <div style={{ position: "absolute", left: 76, top: 400, display: "flex", gap: 14 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ width: 44, height: 22, borderRadius: 11, background: color("accent"), opacity: i < 4 ? 1 : 0.3 }} />
          ))}
        </div>
        <div style={{ position: "absolute", right: 56, top: 160, display: "flex", gap: 24 }}>
          {phone(review, 0)}
          {phone(reader, 60)}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Noto Sans", data: bold, weight: 700, style: "normal" }] },
  );
}
