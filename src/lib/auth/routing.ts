/**
 * Where should this person be? One pure function so the rules in
 * docs/auth-and-roles.md live in one tested place.
 *
 * Every guarded page calls `decide(profile, page)`; a non-null result is the
 * path (without locale) to redirect to.
 */
import type { AccountStatus, UserRole } from "@/types/supabase";

export type GuardProfile = {
  role: UserRole | null;
  status: AccountStatus;
  full_name: string;
};

export type GuardedPage =
  | "root"
  | "sign-in" // T7, T7b/S0b: signed-out pages
  | "onboarding-profile" // name (+ role if missing)
  | "pending" // T7d
  | "invite" // T7e
  | "wrong-account" // T7c
  | "teacher"
  | "student"
  | "admin";

export const signInPath = "/sign-in";

export function needsOnboarding(p: GuardProfile): boolean {
  return p.role === null || p.full_name.trim() === "";
}

/** The landing page for a signed-in person. */
export function homeFor(p: GuardProfile): string {
  if (needsOnboarding(p)) return "/onboarding/profile";
  if (p.role === "admin") return "/admin/teachers";
  if (p.role === "student") return "/student";
  return p.status === "approved" ? "/teacher" : "/onboarding/pending";
}

export function decide(p: GuardProfile | null, page: GuardedPage): string | null {
  if (!p) return page === "sign-in" ? null : signInPath;

  const home = homeFor(p);
  switch (page) {
    case "root":
    case "sign-in":
      return home;
    case "onboarding-profile":
      return needsOnboarding(p) ? null : home;
    case "wrong-account":
      return needsOnboarding(p) ? home : null;
    case "pending":
    case "invite":
      if (needsOnboarding(p)) return home;
      if (p.role !== "teacher") return "/wrong-account?area=teacher";
      return p.status === "approved" ? home : null;
    case "teacher":
    case "student":
    case "admin": {
      if (needsOnboarding(p)) return home;
      if (p.role !== page) return `/wrong-account?area=${page}`;
      if (p.status !== "approved") return home; // pending/rejected teachers
      return null;
    }
  }
}

/** Paths that need a session; the proxy sends signed-out visitors to sign-in before rendering. */
export function isProtectedPath(pathWithoutLocale: string): boolean {
  return /^\/(teacher|student|admin|onboarding|wrong-account)(\/|$)/.test(pathWithoutLocale);
}

/** A `next` path is only followed if it's a local, protected app path (no open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return isProtectedPath(next) ? next : null;
}
