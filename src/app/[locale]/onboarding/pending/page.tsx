import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/features/auth/AuthScreen";
import { PendingApproval } from "@/components/features/auth/PendingApproval";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.pending");
  return { title: t("metaTitle") };
}

/** Canvas T7d · Pending approval. */
export default function Page() {
  return (
    <AuthScreen>
      <Suspense fallback={<Skeleton shape="block" />}>
        <Pending />
      </Suspense>
    </AuthScreen>
  );
}

async function Pending() {
  const { profile, email } = await requireSession("pending");
  return <PendingApproval name={profile.full_name} email={email} rejected={profile.status === "rejected"} />;
}
