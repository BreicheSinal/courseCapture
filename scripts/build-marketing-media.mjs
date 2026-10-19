#!/usr/bin/env node
/**
 * Turns the frames captured by tests/e2e/media/capture.spec.ts into the images on
 * the marketing page (#58): animated WebP for the site, GIFs for sharing, and the
 * PNG screens in the social preview. In Light and Dark.
 *
 *   pnpm media:capture   # frames → tmp/media (needs the e2e stack, see tests/e2e/README.md)
 *   pnpm media           # tmp/media → public/marketing/
 *
 * MEDIA_OUT overrides the frames folder (same variable as the capture).
 */
import { mkdirSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = process.env.MEDIA_OUT ?? "tmp/media";
const OUT = "public/marketing";
const ANIM_WIDTH = 600; // shown at up to 300 CSS px, so 2x
const GIF_WIDTH = 360;
const STEP_MS = 40;

/**
 * Each captured frame: how long it stays (ms) and how it gives way to the next one.
 * cut = same screen, new state · slide = a new page pushes in from the reading end
 * · scroll = the page moves up, the tab bar stays · dip = through the background (loop).
 */
const PLAN = {
  // paste (4) · generating (5) · review · module edit · diagram
  create: [
    [900, "cut"], [450, "cut"], [450, "cut"], [1300, "slide"],
    [900, "cut"], [900, "cut"], [900, "cut"], [900, "cut"], [900, "slide"],
    [2300, "slide"], [1700, "scroll"], [2600, "dip"],
  ],
  // home · course · reader · diagram · card · card flipped · check · answer · certificate
  learn: [
    [1500, "slide"], [1500, "slide"], [1700, "scroll"], [1700, "cut"], [1100, "cut"],
    [1700, "slide"], [1300, "cut"], [2300, "slide"], [2800, "dip"],
  ],
};
/** Which frame stands in for the animation when motion is reduced. */
const POSTER = { create: 9, learn: 2 };
const ease = (t) => 1 - (1 - t) ** 3;

async function raw(file, width) {
  const { data, info } = await sharp(file).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

/** In-between frames for one transition. The tab bar stays put while scrolling. */
function between(a, b, kind, w, h) {
  const row = w * 3;
  const steps = kind === "dip" ? 8 : 6;
  const out = [];
  const bg = a.subarray(0, 3);
  for (let s = 1; s <= steps; s++) {
    const t = ease(s / (steps + 1));
    const f = Buffer.allocUnsafe(a.length);
    if (kind === "slide") {
      const dx = Math.round(w * t); // b enters from the right (inline end in English)
      for (let y = 0; y < h; y++) {
        const o = y * row;
        a.copy(f, o, o + dx * 3, o + row);
        b.copy(f, o + (w - dx) * 3, o, o + dx * 3);
      }
    } else if (kind === "scroll") {
      const top = 0; // the app header scrolls with the page
      const bottom = h - Math.round(h * 0.075);
      a.copy(f, 0, 0, a.length);
      const span = bottom - top;
      const dy = Math.round(span * t);
      for (let y = top; y < bottom; y++) {
        const src = y + dy;
        if (src < bottom) a.copy(f, y * row, src * row, (src + 1) * row);
        else b.copy(f, y * row, (src - span) * row, (src - span + 1) * row);
      }
    } else {
      // dip: fade a to the page background, then b up from it
      const half = s <= steps / 2;
      const src = half ? a : b;
      const k = half ? s / (steps / 2) : (steps - s) / (steps / 2);
      for (let i = 0; i < f.length; i++) f[i] = src[i] + (bg[i % 3] - src[i]) * k;
    }
    out.push(f);
  }
  return out;
}

/** Frames + transitions, as one tall raw strip for sharp's animated output. */
async function sequence(files, plan, width) {
  const frames = await Promise.all(files.map((f) => raw(f, width)));
  const { width: w, height: h } = frames[0].info;
  const pages = [];
  const delay = [];
  frames.forEach((f, i) => {
    const [hold, kind] = plan[i] ?? [1200, "cut"];
    pages.push(f.data);
    delay.push(hold);
    if (kind === "cut") return;
    for (const p of between(f.data, frames[(i + 1) % frames.length].data, kind, w, h)) {
      pages.push(p);
      delay.push(STEP_MS);
    }
  });
  const strip = sharp(Buffer.concat(pages), { raw: { width: w, height: h * pages.length, channels: 3, pageHeight: h } });
  return { strip, delay, w, h };
}

async function build(theme, name) {
  const dir = join(SRC, theme, name);
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => join(dir, f));
  if (files.length !== PLAN[name].length) {
    console.warn(`${dir}: ${files.length} frames, expected ${PLAN[name].length}; unlisted frames hold 1.2s`);
  }
  const anim = await sequence(files, PLAN[name], ANIM_WIDTH);
  await anim.strip.webp({ quality: 74, effort: 4, loop: 0, delay: anim.delay }).toFile(join(OUT, theme, `${name}.webp`));
  const gif = await sequence(files, PLAN[name], GIF_WIDTH);
  await gif.strip.gif({ loop: 0, delay: gif.delay, effort: 7, colours: 128, dither: 0.6 }).toFile(join(OUT, theme, `${name}.gif`));
  await sharp(files[POSTER[name]]).resize({ width: ANIM_WIDTH }).webp({ quality: 80 }).toFile(join(OUT, theme, `${name}-poster.webp`));
  return { name, w: anim.w, h: anim.h, frames: anim.delay.length };
}

if (!existsSync(SRC)) {
  console.error(`No frames in ${SRC}. Run \`pnpm media:capture\` first.`);
  process.exit(1);
}
const sizes = {};
for (const theme of ["light", "dark"]) {
  mkdirSync(join(OUT, theme), { recursive: true });
  for (const name of ["create", "learn"]) {
    const r = await build(theme, name);
    sizes[r.name] = { width: r.w, height: r.h };
    console.log(`${theme}/${name}: ${r.frames} frames`);
  }
}
// Social preview screens (src/app/[locale]/opengraph-image.tsx): PNG, since next/og can't read WebP.
mkdirSync(join(OUT, "og"), { recursive: true });
await sharp(join(SRC, "light/views/teacher-review.png")).resize({ width: 500 }).png({ palette: true, quality: 90 }).toFile(join(OUT, "og/review.png"));
await sharp(join(SRC, "light/views/student-reader.png")).resize({ width: 500 }).png({ palette: true, quality: 90 }).toFile(join(OUT, "og/reader.png"));
// Intrinsic sizes for next/image-free <img width height>, so nothing shifts as images load.
writeFileSync(join(OUT, "sizes.json"), JSON.stringify(sizes, null, 2) + "\n");
console.log(`Wrote ${OUT}/`);
