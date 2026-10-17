"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin actions. The database functions check that the caller is an approved
 * admin (is_admin()), so these can't be misused even if called directly.
 */
export type AdminState = { error?: "invalidSchool" | "generic"; createdCode?: string } | undefined;

export async function setTeacherStatus(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("teacher"));
  const status = z.enum(["approved", "rejected"]).parse(formData.get("status"));
  const supabase = await createClient();
  await supabase.rpc("set_teacher_status", { p_teacher: id, p_status: status });
  refresh();
}

export async function createInvite(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const school = z.string().trim().min(1).max(120).safeParse(formData.get("school_name"));
  if (!school.success) return { error: "invalidSchool" };
  const uses = z.coerce.number().int().min(1).max(500).catch(1).parse(formData.get("max_uses"));
  const days = z.coerce.number().int().min(1).max(90).catch(7).parse(formData.get("expires_in_days"));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_teacher_invite", {
    p_school_name: school.data,
    p_max_uses: uses,
    p_expires_in_days: days,
  });
  if (error || !data) return { error: "generic" };
  refresh();
  return { createdCode: data.code };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const code = z.string().min(1).max(20).parse(formData.get("code"));
  const supabase = await createClient();
  await supabase.rpc("revoke_teacher_invite", { p_code: code });
  refresh();
}
