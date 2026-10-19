import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsEnabled, redactAnalyticsUrl } from "@/lib/analytics";

const id = "3f2a9c1e-7b4d-4e2a-9f10-2c6d8e0a1b3c";

describe("redactAnalyticsUrl", () => {
  it("replaces ids in the path and keeps the origin", () => {
    expect(redactAnalyticsUrl(`https://cc.app/en/teacher/classes/${id}/students/${id}`)).toBe(
      "https://cc.app/en/teacher/classes/:id/students/:id",
    );
  });

  it("keeps module positions and plain words", () => {
    expect(redactAnalyticsUrl(`https://cc.app/ar/student/courses/${id}/modules/3/check`)).toBe(
      "https://cc.app/ar/student/courses/:id/modules/3/check",
    );
  });

  it("drops the query string and fragment", () => {
    expect(redactAnalyticsUrl(`https://cc.app/en/teacher/courses/new?class=${id}#top`)).toBe(
      "https://cc.app/en/teacher/courses/new",
    );
    expect(redactAnalyticsUrl("https://cc.app/en/sign-in?error=expired")).toBe("https://cc.app/en/sign-in");
  });

  it("doesn't report the sign-in callback or the design preview", () => {
    expect(redactAnalyticsUrl("https://cc.app/auth/callback?code=secret")).toBeNull();
    expect(redactAnalyticsUrl("https://cc.app/fr/design")).toBeNull();
  });

  it("handles relative URLs", () => {
    expect(redactAnalyticsUrl(`/es/student/classes/${id}`)).toBe("/es/student/classes/:id");
  });
});

describe("analyticsEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is on only on Vercel, unless turned off", () => {
    vi.stubEnv("VERCEL", "");
    expect(analyticsEnabled()).toBe(false);
    vi.stubEnv("VERCEL", "1");
    expect(analyticsEnabled()).toBe(true);
    vi.stubEnv("ANALYTICS", "off");
    expect(analyticsEnabled()).toBe(false);
  });
});
