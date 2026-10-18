import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Cleans an AI-drawn SVG before it's stored or shown (CLAUDE.md rule 6,
 * PRD FR-12, docs/theming.md). Allowlist only:
 * - shapes, text, groups, gradients and markers with presentation attributes;
 * - no scripts, foreignObject, images, links, styles, classes or event handlers;
 * - values are checked against strict patterns (numbers, colours, local url(#id));
 * - ids are prefixed so they can't collide with the page's ids;
 * - white / black fills and strokes become currentColor or none, so diagrams
 *   work in Light and Dark;
 * - text gets direction="rtl" for right-to-left course languages.
 */
const tags = [
  "svg",
  "g",
  "defs",
  "title",
  "desc",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "marker",
  "linearGradient",
  "radialGradient",
  "stop",
  "symbol",
  "use",
];

const paint = ["fill", "stroke", "stop-color"];
const shared = [
  "id",
  "transform",
  ...paint,
  "fill-opacity",
  "fill-rule",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "clip-rule",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "direction",
  "marker-start",
  "marker-mid",
  "marker-end",
  "vector-effect",
];

const attrs: Record<string, string[]> = {
  svg: ["viewBox", "width", "height", "xmlns", "preserveAspectRatio", ...shared],
  path: ["d", "pathLength", ...shared],
  rect: ["x", "y", "width", "height", "rx", "ry", ...shared],
  circle: ["cx", "cy", "r", ...shared],
  ellipse: ["cx", "cy", "rx", "ry", ...shared],
  line: ["x1", "y1", "x2", "y2", ...shared],
  polyline: ["points", ...shared],
  polygon: ["points", ...shared],
  text: ["x", "y", "dx", "dy", "rotate", ...shared],
  tspan: ["x", "y", "dx", "dy", ...shared],
  marker: ["viewBox", "refX", "refY", "markerWidth", "markerHeight", "orient", "markerUnits", ...shared],
  linearGradient: ["x1", "y1", "x2", "y2", "gradientUnits", ...shared],
  radialGradient: ["cx", "cy", "r", "fx", "fy", "gradientUnits", ...shared],
  stop: ["offset", "stop-opacity", ...shared],
  symbol: ["viewBox", ...shared],
  use: ["href", "x", "y", "width", "height", ...shared],
  g: shared,
  defs: shared,
  title: [],
  desc: [],
};

const idPattern = /^[A-Za-z][\w-]{0,40}$/;
const number = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?(px|%|em)?$/i;
const numberList = /^[-\d.,\s eE%]+$/;
const pathData = /^[MmZzLlHhVvCcSsQqTtAa\d\s,.eE+-]+$/;
const transform = /^((matrix|translate|scale|rotate|skewX|skewY)\(\s*[-\d.,\s eE]+\)\s*)+$/;
const color = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
const keyword = /^[a-z-]{1,24}$/i;
const localRef = /^url\(#([A-Za-z][\w-]{0,40})\)$/;
const whites = new Set(["#fff", "#ffffff", "white", "#fefefe", "#fafafa", "#f5f5f5", "rgb(255,255,255)"]);
const blacks = new Set(["#000", "#000000", "black", "#111", "#111111", "#222", "#222222", "rgb(0,0,0)"]);

/** Checks one attribute value; returns the cleaned value or null to drop it. */
function cleanValue(name: string, raw: string, prefix: string): string | null {
  const value = raw.trim();
  // CSS escapes ("\75 rl(") and anything that could load or run something.
  if (/[\\<>"'`;{}]|javascript:|data:|expression/i.test(value)) return null;
  if (name === "id") return idPattern.test(value) ? `${prefix}-${value}` : null;
  if (name === "href") {
    const m = /^#([A-Za-z][\w-]{0,40})$/.exec(value);
    return m ? `#${prefix}-${m[1]}` : null;
  }
  if (paint.includes(name) || name.startsWith("marker-")) {
    const ref = localRef.exec(value.replace(/\s+/g, ""));
    if (ref) return `url(#${prefix}-${ref[1]})`;
    if (name.startsWith("marker-")) return null;
    const lower = value.toLowerCase().replace(/\s+/g, "");
    if (lower === "none" || lower === "currentcolor" || lower === "transparent") return value;
    // Fixed white or black would vanish in one of the themes (docs/theming.md).
    if (whites.has(lower)) return name === "fill" ? "none" : "currentColor";
    if (blacks.has(lower)) return "currentColor";
    return color.test(value) ? value : null;
  }
  if (name === "d") return pathData.test(value) ? value : null;
  if (name === "points" || name === "viewBox" || name === "stroke-dasharray")
    return numberList.test(value) ? value : null;
  if (name === "transform") return transform.test(value) ? value : null;
  if (["offset", "opacity", "fill-opacity", "stroke-opacity", "stop-opacity"].includes(name))
    return number.test(value) ? value : null;
  if (["xmlns"].includes(name)) return value === "http://www.w3.org/2000/svg" ? value : null;
  if (number.test(value)) return value;
  return keyword.test(value) ? value : null;
}

export function sanitizeSvg(
  input: string,
  { idPrefix = "d", rtl = false, maxLength = 60_000 }: { idPrefix?: string; rtl?: boolean; maxLength?: number } = {},
): string | null {
  if (!input || input.length > maxLength) return null;
  const prefix = idPrefix.replace(/[^\w-]/g, "") || "d";
  const clean = sanitizeHtml(input, {
    allowedTags: tags,
    allowedAttributes: attrs,
    allowedSchemes: [],
    allowProtocolRelative: false,
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false, xmlMode: true },
    exclusiveFilter: (frame) => frame.tag === "use" && !frame.attribs.href,
    transformTags: {
      "*": (tagName, attribs) => {
        const kept: Record<string, string> = {};
        for (const [name, value] of Object.entries(attribs)) {
          if (/^on/i.test(name)) continue;
          const v = cleanValue(name, value, prefix);
          if (v !== null) kept[name] = v;
        }
        if (rtl && (tagName === "text" || tagName === "tspan")) kept.direction = "rtl";
        return { tagName, attribs: kept };
      },
    },
  }).trim();
  return clean.startsWith("<svg") ? clean : null;
}
