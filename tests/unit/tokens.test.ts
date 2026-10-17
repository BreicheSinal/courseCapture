import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isActive } from "@/components/layout/nav";

const tokensCss = readFileSync("src/styles/generated/tokens.css", "utf8");
const componentsCss = readFileSync("src/styles/generated/components.css", "utf8");
const tokens = JSON.parse(readFileSync("design-system/tokens.json", "utf8"));

describe("generated design tokens", () => {
  it("defines every colour for light, system-dark and explicit dark", () => {
    for (const c of tokens.color.tokens) {
      expect(tokensCss.match(new RegExp(`--${c.name}: `, "g"))?.length).toBeGreaterThanOrEqual(3);
    }
    expect(tokensCss).toContain("@media (prefers-color-scheme: dark)");
    expect(tokensCss).toContain(':root[data-theme="dark"]');
  });

  it("exposes colours to Tailwind and removes its default palette", () => {
    expect(tokensCss).toContain("--color-*: initial;");
    expect(tokensCss).toContain("--color-surface: var(--surface);");
  });

  it("leaves no physical left/right rules in component CSS (RTL)", () => {
    expect(componentsCss).not.toMatch(/margin-(left|right):|padding-(left|right):|text-align:(left|right)/);
    expect(componentsCss).not.toMatch(/[;{](left|right):/);
  });
});

describe("navigation", () => {
  it("marks the current section active", () => {
    expect(isActive("/teacher/classes/abc", "/teacher/classes")).toBe(true);
    expect(isActive("/teacher/courses", "/teacher/classes")).toBe(false);
    expect(isActive("/student/classes", "/student")).toBe(false);
    expect(isActive("/student", "/student")).toBe(true);
  });
});
