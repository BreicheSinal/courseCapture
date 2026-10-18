import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sanitizeSvg } = await import("@/lib/svg/sanitize");

describe("sanitizeSvg", () => {
  it("keeps shapes, text and local markers", () => {
    const svg =
      '<svg viewBox="0 0 10 10"><defs><marker id="a"><path d="M0 0L5 5"/></marker></defs><path d="M1 1L9 9" stroke="currentColor" marker-end="url(#a)"/><text x="1" y="5">CO₂</text></svg>';
    const out = sanitizeSvg(svg)!;
    expect(out).toContain('marker-end="url(#d-a)"');
    expect(out).toContain("<text");
    expect(out).toContain("viewBox");
  });

  it("removes scripts, event handlers, foreignObject, images and links", () => {
    const svg =
      '<svg onload="alert(1)"><script>alert(1)</script><foreignObject><div>x</div></foreignObject><image href="http://x/y.png"/><a href="javascript:alert(1)"><rect width="1" height="1" onclick="x()"/></a><rect width="2" height="2"/></svg>';
    const out = sanitizeSvg(svg)!;
    expect(out).not.toMatch(/script|onload|onclick|foreignObject|image|javascript|<a/i);
    expect(out).toContain('<rect width="2" height="2"');
  });

  it("drops style attributes and remote url() references", () => {
    const out = sanitizeSvg(
      '<svg><rect style="fill:url(http://x)" fill="url(https://evil/x)" stroke="red" width="1" height="1"/></svg>',
    )!;
    expect(out).not.toMatch(/style|http/);
    expect(out).toContain('stroke="red"');
  });

  it("drops <use> pointing outside the SVG", () => {
    const out = sanitizeSvg('<svg><use href="https://evil/s.svg#x"/><use href="#ok"/></svg>')!;
    expect(out).not.toContain("evil");
    expect(out).toContain('href="#d-ok"');
  });

  it("rejects non-SVG and oversized input", () => {
    expect(sanitizeSvg("<div>hi</div>")).toBeNull();
    expect(sanitizeSvg("<svg>" + "a".repeat(70_000) + "</svg>")).toBeNull();
  });
});

describe("sanitizeSvg hardening", () => {
  it("drops CSS-escaped url() and any backslash", () => {
    const out = sanitizeSvg(
      '<svg><rect fill="\\75 rl(https://evil/t)" marker-end="u\\72l(#a)" stroke="blue" width="1" height="1"/></svg>',
    )!;
    expect(out).not.toMatch(/evil|\\/);
    expect(out).toContain('stroke="blue"');
  });

  it("removes class and prefixes ids and their references", () => {
    const out = sanitizeSvg(
      '<svg class="fixed inset-0"><defs><marker id="arrow"><path d="M0 0L5 5"/></marker></defs><path d="M1 1L9 9" marker-end="url(#arrow)"/><use href="#arrow"/></svg>',
      { idPrefix: "m3" },
    )!;
    expect(out).not.toContain("class=");
    expect(out).toContain('id="m3-arrow"');
    expect(out).toContain('marker-end="url(#m3-arrow)"');
    expect(out).toContain('href="#m3-arrow"');
  });

  it("keeps camelCase gradients", () => {
    const out = sanitizeSvg(
      '<svg><defs><linearGradient id="g"><stop offset="0" stop-color="#0071e3"/></linearGradient></defs><rect fill="url(#g)" width="1" height="1"/></svg>',
    )!;
    expect(out).toContain("<linearGradient");
    expect(out).toContain('fill="url(#d-g)"');
  });

  it("turns fixed white and black into theme-safe values", () => {
    const out = sanitizeSvg(
      '<svg><rect fill="#fff" stroke="#000" width="9" height="9"/><text fill="black">x</text></svg>',
    )!;
    expect(out).toContain('fill="none"');
    expect(out).toContain('stroke="currentColor"');
    expect(out).toContain('<text fill="currentColor"');
  });

  it("keeps the theme accent but no other CSS variables", () => {
    const out = sanitizeSvg(
      '<svg><rect fill="var(--accent)" stroke="var(--accent-text)" width="9" height="9"/><circle fill="var(--x, url(https://e))" r="2"/></svg>',
    )!;
    expect(out).toContain('fill="var(--accent)"');
    expect(out).not.toMatch(/accent-text|--x|https/);
  });

  it("marks text right-to-left for RTL courses", () => {
    expect(sanitizeSvg('<svg><text x="1">نص</text></svg>', { rtl: true })).toContain('direction="rtl"');
  });

  it("strips xlink:href, style, animate and set", () => {
    const out = sanitizeSvg(
      '<svg><style>*{}</style><use xlink:href="https://evil/x"/><rect width="1" height="1"><animate attributeName="x"/><set attributeName="y"/></rect></svg>',
    )!;
    expect(out).not.toMatch(/style|xlink|evil|animate|<set/);
  });
});
