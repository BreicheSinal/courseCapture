import { describe, expect, it } from "vitest";
import { decide, homeFor, isProtectedPath, safeNext, type GuardProfile } from "@/lib/auth/routing";
import { formatInviteCode, isValidInviteCode, normalizeInviteCode } from "@/lib/auth/invite-code";

const p = (over: Partial<GuardProfile>): GuardProfile => ({ role: "student", status: "approved", full_name: "Maya", ...over });

describe("homeFor", () => {
  it("sends each kind of account to its home", () => {
    expect(homeFor(p({}))).toBe("/student");
    expect(homeFor(p({ role: "teacher" }))).toBe("/teacher");
    expect(homeFor(p({ role: "teacher", status: "pending" }))).toBe("/onboarding/pending");
    expect(homeFor(p({ role: "teacher", status: "rejected" }))).toBe("/onboarding/pending");
    expect(homeFor(p({ role: "admin" }))).toBe("/admin/teachers");
    expect(homeFor(p({ role: null }))).toBe("/onboarding/profile");
    expect(homeFor(p({ full_name: "  " }))).toBe("/onboarding/profile");
  });
});

describe("decide", () => {
  it("sends signed-out visitors to sign-in, except on sign-in pages", () => {
    expect(decide(null, "teacher")).toBe("/sign-in");
    expect(decide(null, "app")).toBe("/sign-in");
    expect(decide(null, "sign-in")).toBeNull();
  });

  it("moves signed-in people off sign-in", () => {
    expect(decide(p({}), "sign-in")).toBe("/student");
  });

  it("/app sends everyone home; the marketing page on / isn't guarded (#58)", () => {
    expect(decide(p({}), "app")).toBe("/student");
    expect(decide(p({ role: "teacher" }), "app")).toBe("/teacher");
    expect(decide(p({ role: null }), "app")).toBe("/onboarding/profile");
  });

  it("finishes onboarding before anything else", () => {
    expect(decide(p({ role: null }), "teacher")).toBe("/onboarding/profile");
    expect(decide(p({ role: null }), "onboarding-profile")).toBeNull();
    expect(decide(p({}), "onboarding-profile")).toBe("/student");
  });

  it("keeps pending teachers on the approval pages", () => {
    const pending = p({ role: "teacher", status: "pending" });
    expect(decide(pending, "teacher")).toBe("/onboarding/pending");
    expect(decide(pending, "pending")).toBeNull();
    expect(decide(pending, "invite")).toBeNull();
    expect(decide(p({ role: "teacher" }), "pending")).toBe("/teacher");
  });

  it("shows the wrong-account page for the other role's area", () => {
    expect(decide(p({}), "teacher")).toBe("/wrong-account?area=teacher");
    expect(decide(p({ role: "teacher" }), "student")).toBe("/wrong-account?area=student");
    expect(decide(p({}), "admin")).toBe("/wrong-account?area=admin");
    expect(decide(p({}), "invite")).toBe("/wrong-account?area=teacher");
  });

  it("lets approved people into their own area", () => {
    expect(decide(p({}), "student")).toBeNull();
    expect(decide(p({ role: "teacher" }), "teacher")).toBeNull();
    expect(decide(p({ role: "admin" }), "admin")).toBeNull();
  });
});

describe("paths", () => {
  it("knows which paths need a session", () => {
    expect(isProtectedPath("/teacher/classes")).toBe(true);
    expect(isProtectedPath("/onboarding/pending")).toBe(true);
    expect(isProtectedPath("/sign-in")).toBe(false);
    expect(isProtectedPath("/teachers-lounge")).toBe(false);
  });

  it("refuses open redirects", () => {
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("/sign-in")).toBeNull();
    expect(safeNext("/teacher/classes")).toBe("/teacher/classes");
  });
});

describe("invite codes", () => {
  it("normalises, validates and formats", () => {
    expect(normalizeInviteCode(" cdrh-4k7q ")).toBe("CDRH4K7Q");
    expect(isValidInviteCode("CDRH-4K7Q")).toBe(true);
    expect(isValidInviteCode("CDRH-4K7O")).toBe(false); // O is not in the alphabet
    expect(isValidInviteCode("ABC")).toBe(false);
    expect(formatInviteCode("CDRH4K7Q")).toBe("CDRH-4K7Q");
  });
});
