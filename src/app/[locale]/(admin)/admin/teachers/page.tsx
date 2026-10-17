import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherApprovals } from "@/components/features/admin/TeacherApprovals";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.teachers");
  return { title: t("metaTitle") };
}

/** Admin · approve or reject teacher accounts. */
export default async function Page() {
  const supabase = await createClient();
  const cols = "id, full_name, email, status, created_at, approved_via_invite";
  const [pending, decided] = await Promise.all([
    supabase.from("profiles").select(cols).eq("role", "teacher").eq("status", "pending").order("created_at"),
    supabase
      .from("profiles")
      .select(cols)
      .eq("role", "teacher")
      .neq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  return <TeacherApprovals pending={pending.data ?? []} decided={decided.data ?? []} />;
}
