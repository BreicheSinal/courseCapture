"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import type { ClassRow } from "@/types/supabase";

/**
 * Teacher actions. The database checks every one (RLS and the class
 * functions), so a call for someone else's class changes nothing.
 * Errors come back as keys translated under `teacher.errors.*`.
 */
export type ClassErrorKey = "nameRequired" | "nameTooLong" | "sectionTooLong" | "bodyRequired" | "bodyTooLong" | "nameMismatch" | "generic";

const localeSchema = z.enum(locales).catch("en");
const uuid = z.string().uuid();

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "nameRequired" })
  .max(60, { message: "nameTooLong" });
const sectionSchema = z.string().trim().max(40, { message: "sectionTooLong" });

export type ClassFormState = { error?: ClassErrorKey; field?: "name" | "section"; saved?: ClassRow } | undefined;

function readClassForm(formData: FormData) {
  const name = nameSchema.safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message as ClassErrorKey, field: "name" as const };
  const section = sectionSchema.safeParse(formData.get("section") ?? "");
  if (!section.success) return { error: section.error.issues[0].message as ClassErrorKey, field: "section" as const };
  return { name: name.data, section: section.data };
}

/** T9 · "Create class". Returns the new class so the screen can show its join code. */
export async function createClass(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const form = readClassForm(formData);
  if ("error" in form) return form;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_class", { p_name: form.name, p_section: form.section });
  if (error || !data) return { error: "generic" };
  return { saved: data };
}

/** T9 "Edit class name" and the class page's edit form. */
export async function updateClass(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "generic" };
  const form = readClassForm(formData);
  if ("error" in form) return form;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .update({ name: form.name, section: form.section })
    .eq("id", id.data)
    .select()
    .maybeSingle();
  if (error || !data) return { error: "generic" };
  refresh();
  return { saved: data };
}

/** Join code bar · "New code" (second press). Returns the new code, or null on failure. */
export async function regenerateJoinCode(classId: string): Promise<string | null> {
  const id = uuid.safeParse(classId);
  if (!id.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_join_code", { p_class: id.data });
  if (error || !data) return null;
  refresh();
  return data;
}

export type DeleteState = { error?: ClassErrorKey } | undefined;

/** T15 · "Delete class": the typed name must match, checked here as well as in the form. */
export async function deleteClass(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "generic" };
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("name").eq("id", id.data).maybeSingle();
  if (!cls) return { error: "generic" };
  if (String(formData.get("confirm") ?? "").trim() !== cls.name.trim()) return { error: "nameMismatch" };
  const { error, count } = await supabase.from("classes").delete({ count: "exact" }).eq("id", id.data);
  if (error || count !== 1) return { error: "generic" };
  redirect({ href: "/teacher/classes?deleted=1", locale });
}

/** T12 · "Remove from class". */
export async function removeStudent(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const classId = uuid.safeParse(formData.get("class"));
  const studentId = uuid.safeParse(formData.get("student"));
  if (!classId.success || !studentId.success) return { error: "generic" };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("class_members")
    .delete({ count: "exact" })
    .eq("class_id", classId.data)
    .eq("student_id", studentId.data);
  if (error || count !== 1) return { error: "generic" };
  redirect({ href: `/teacher/classes/${classId.data}/students?removed=1`, locale });
}

export type AnnouncementState = { error?: ClassErrorKey; posted?: number } | undefined;

/** T13 · "Post". */
export async function postAnnouncement(prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const classId = uuid.safeParse(formData.get("class"));
  if (!classId.success) return { error: "generic" };
  const body = z.string().trim().safeParse(formData.get("body") ?? "");
  if (!body.success || !body.data) return { error: "bodyRequired" };
  if ([...body.data].length > 500) return { error: "bodyTooLong" }; // characters, as the database counts
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ class_id: classId.data, body: body.data });
  if (error) return { error: "generic" };
  refresh();
  return { posted: (prev?.posted ?? 0) + 1 };
}

/** T13 · trash icon, second press. */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return false;
  const supabase = await createClient();
  const { error, count } = await supabase.from("announcements").delete({ count: "exact" }).eq("id", parsed.data);
  if (error || count !== 1) return false;
  refresh();
  return true;
}

export type SettingsState = { error?: ClassErrorKey; saved?: number } | undefined;

/** T14 · profile name. */
export async function saveProfileName(prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("full_name") ?? "");
  if (!name.success) return { error: "nameRequired" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) return { error: "generic" };
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", uid);
  if (error) return { error: "generic" };
  refresh();
  return { saved: (prev?.saved ?? 0) + 1 };
}

/** T14 · new course defaults (language and level for T1, stage 5). */
export async function saveCourseDefaults(prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const locale = z.enum(locales).safeParse(formData.get("default_course_locale"));
  const level = z.enum(["beginner", "intermediate", "advanced"]).safeParse(formData.get("default_course_level"));
  if (!locale.success || !level.success) return { error: "generic" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) return { error: "generic" };
  const { error } = await supabase
    .from("profiles")
    .update({ default_course_locale: locale.data, default_course_level: level.data })
    .eq("id", uid);
  if (error) return { error: "generic" };
  refresh();
  return { saved: (prev?.saved ?? 0) + 1 };
}

