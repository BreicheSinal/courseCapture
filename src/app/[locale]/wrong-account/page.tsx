import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/features/auth/AuthScreen";
import { WrongAccount } from "@/components/features/auth/WrongAccount";
import { Skeleton } from "@/components/ui/Skeleton";
import { homeFor } from "@/lib/auth/routing";
import { requireSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.wrongAccount");
  return { title: t("metaTitle") };
}

/** Canvas T7c · Wrong account type. */
export default async function Page({ searchParams }: PageProps<"/[locale]/wrong-account">) {
  const t = await getTranslations("auth.wrongAccount");
  return (
    <AuthScreen back={{ href: "/", label: t("back") }}>
      <Suspense fallback={<Skeleton shape="block" />}>
        <Mismatch searchParams={searchParams} />
      </Suspense>
    </AuthScreen>
  );
}

async function Mismatch({ searchParams }: Pick<PageProps<"/[locale]/wrong-account">, "searchParams">) {
  const [{ profile, email }, { area }] = await Promise.all([requireSession("wrong-account"), searchParams]);
  const role = profile.role!;
  const wanted = area === "teacher" || area === "student" || area === "admin" ? area : role === "student" ? "teacher" : "student";
  return <WrongAccount email={email} role={role} area={wanted} home={homeFor(profile)} />;
}
