import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { InviteCodes } from "@/components/features/admin/InviteCodes";
import { createClient } from "@/lib/supabase/server";
import { requestTime } from "@/lib/utils/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.invites");
  return { title: t("metaTitle") };
}

/** Admin · create and revoke teacher invite codes. */
export default async function Page() {
  await connection();
  const now = requestTime();
  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_invites")
    .select("code, school_name, max_uses, uses, expires_at, revoked_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return <InviteCodes invites={data ?? []} now={now} />;
}
