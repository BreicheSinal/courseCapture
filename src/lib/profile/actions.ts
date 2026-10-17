"use server";

import { z } from "zod";
import { locales } from "@/i18n/locales";
import { createClient } from "@/lib/supabase/server";

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
