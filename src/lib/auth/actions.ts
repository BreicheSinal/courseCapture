"use server";

import { redirect as nextRedirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/locales";
import { appUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "./routing";
import { isValidInviteCode, normalizeInviteCode } from "./invite-code";

/**
 * Auth server actions. Each returns an error *key* (translated in the UI under
 * `auth.errors.*`) instead of a message, so copy stays in src/messages.
 */
export type AuthErrorKey =
  | "invalidEmail"
  | "rateLimited"
  | "sendFailed"
  | "oauthFailed"
  | "invalidName"
  | "roleRequired"
  | "invalidCode"
  | "codeNotFound"
  | "generic";

export type FormState = { error?: AuthErrorKey; ok?: boolean } | undefined;

const localeSchema = z.enum(locales);
const roleSchema = z.enum(["teacher", "student"]);
const emailSchema = z.string().trim().toLowerCase().email().max(254);

function callbackUrl(locale: Locale, role?: string) {
  const params = new URLSearchParams({ locale });
  if (role) params.set("role", role);
  return `${appUrl}/auth/callback?${params}`;
}

async function sendLink(email: string, role: "teacher" | "student", locale: Locale): Promise<AuthErrorKey | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl(locale, role),
      // Read once by the profile trigger when the account is created.
      data: { role, locale },
    },
  });
  if (!error) return null;
  return error.status === 429 ? "rateLimited" : "sendFailed";
}

/** T7 · "Email me a sign-in link". */
export async function sendSignInLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeSchema.catch("en").parse(formData.get("locale"));
  const role = roleSchema.catch("teacher").parse(formData.get("role"));
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "invalidEmail" };

  const err = await sendLink(email.data, role, locale);
  if (err) return { error: err };

  const qs = new URLSearchParams({ email: email.data, role });
  redirect({ href: `/sign-in/check-email?${qs}`, locale });
}

/** T7b/S0b · "Resend link". */
export async function resendSignInLink(email: string, role: string, locale: string): Promise<FormState> {
  const e = emailSchema.safeParse(email);
  if (!e.success) return { error: "invalidEmail" };
  const err = await sendLink(e.data, roleSchema.catch("teacher").parse(role), localeSchema.catch("en").parse(locale));
  return err ? { error: err } : { ok: true };
}

/** T7 · "Continue with school account" (Google). */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const locale = localeSchema.catch("en").parse(formData.get("locale"));
  const role = roleSchema.catch("teacher").parse(formData.get("role"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(locale, role) },
  });
  if (error || !data.url) redirect({ href: "/sign-in?error=oauthFailed", locale });
  nextRedirect(data.url!);
}

export async function signOut(formData: FormData): Promise<void> {
  const locale = localeSchema.catch("en").parse(formData.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/sign-in", locale });
}

/** First sign-in: name, plus role if it wasn't picked at sign-in. */
export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeSchema.catch("en").parse(formData.get("locale"));
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("full_name"));
  if (!name.success) return { error: "invalidName" };
  const roleRaw = formData.get("role");
  const role = roleRaw ? roleSchema.safeParse(roleRaw) : null;
  if (role && !role.success) return { error: "roleRequired" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_full_name: name.data,
    p_role: role?.data ?? null,
  });
  if (error) return { error: error.message.includes("role_required") ? "roleRequired" : "generic" };
  redirect({ href: homeFor(data), locale });
}

/** T7d · "Check again". Moves on if approved; otherwise reports the time checked. */
export async function checkApproval(formData: FormData): Promise<void> {
  const locale = localeSchema.catch("en").parse(formData.get("locale"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/sign-in", locale });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name")
    .eq("id", user!.id)
    .single();
  if (profile?.status === "approved") redirect({ href: homeFor(profile), locale });
  refresh();
}

export type InviteState =
  | { step: "enter"; error?: AuthErrorKey; code?: string }
  | { step: "confirm"; code: string; school: string; invitedBy: string };

/** T7e step 1 · "Check code". */
export async function checkInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const raw = String(formData.get("code") ?? "");
  if (!isValidInviteCode(raw)) return { step: "enter", error: "invalidCode", code: raw };
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_teacher_invite", { p_code: raw });
  const hit = data?.[0];
  if (!hit) return { step: "enter", error: "codeNotFound", code: raw };
  return { step: "confirm", code: normalizeInviteCode(raw), school: hit.school_name, invitedBy: hit.invited_by };
}

/** T7e step 2 · "Join <school>". */
export async function redeemInvite(formData: FormData): Promise<void> {
  const locale = localeSchema.catch("en").parse(formData.get("locale"));
  const code = String(formData.get("code") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_teacher_invite", { p_code: code });
  if (error) redirect({ href: "/onboarding/invite?error=codeNotFound", locale });
  redirect({ href: "/teacher", locale });
}

/** Saves the theme on the profile so it follows the person to other devices (docs/theming.md). */
export async function saveThemePreference(theme: string): Promise<void> {
  const parsed = z.enum(["system", "light", "dark"]).safeParse(theme);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ theme: parsed.data }).eq("id", user.id);
}
