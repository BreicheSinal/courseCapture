"use server";

import { z } from "zod";
import { locales } from "@/i18n/locales";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: "nameRequired" | "generic"; saved?: number } | undefined;

/** Settings / Account · the person's own name (any role). */
export async function saveProfileName(prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("full_name") ?? "");
  if (!name.success) return { error: "nameRequired" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", user.id);
  if (error) return { error: "generic" };
  refresh();
  return { saved: (prev?.saved ?? 0) + 1 };
}

/**
 * Interface language, remembered on the profile for every role (used for
 * emails such as the approval email). Only ever touches the caller's own row.
 * Returns false when it couldn't be saved; the page still switches language.
 */
export async function saveInterfaceLocale(locale: string): Promise<boolean> {
  const parsed = z.enum(locales).safeParse(locale);
  if (!parsed.success) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("profiles").update({ ui_locale: parsed.data }).eq("id", user.id);
  return !error;
}
