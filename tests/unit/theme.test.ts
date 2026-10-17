import { describe, expect, it } from "vitest";
import { parseThemePref, readThemeCookie, themeInitScript } from "@/lib/theme/theme";

describe("theme preference", () => {
  it("defaults to system for missing or unknown values", () => {
    expect(parseThemePref(undefined)).toBe("system");
    expect(parseThemePref("purple")).toBe("system");
  });

  it("reads light and dark from the cookie", () => {
    expect(readThemeCookie("a=1; cc-theme=dark; b=2")).toBe("dark");
    expect(readThemeCookie("cc-theme=light")).toBe("light");
    expect(readThemeCookie("cc-theme=system")).toBe("system");
    expect(readThemeCookie("")).toBe("system");
  });

  it("ships a tiny pre-paint script", () => {
    expect(themeInitScript.length).toBeLessThan(300);
    expect(themeInitScript).toContain("cc-theme");
  });
});
