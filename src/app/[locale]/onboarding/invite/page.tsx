import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/features/auth/AuthScreen";
import { InviteCodeForm } from "@/components/features/auth/InviteCodeForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.invite");
  return { title: t("metaTitle") };
}

/** Canvas T7e · Invite code. */
export default async function Page({ searchParams }: PageProps<"/[locale]/onboarding/invite">) {
  const t = await getTranslations("auth.invite");
  return (
    <AuthScreen back={{ href: "/onboarding/pending", label: t("back") }}>
      <Suspense fallback={<Skeleton shape="block" />}>
        <Invite searchParams={searchParams} />
      </Suspense>
    </AuthScreen>
  );
}

async function Invite({ searchParams }: Pick<PageProps<"/[locale]/onboarding/invite">, "searchParams">) {
  const [, { error }] = await Promise.all([requireSession("invite"), searchParams]);
  return <InviteCodeForm initialError={error === "codeNotFound" ? "codeNotFound" : undefined} />;
}
