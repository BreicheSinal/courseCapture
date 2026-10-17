import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { AuthScreen } from "@/components/features/auth/AuthScreen";
import { CheckEmail } from "@/components/features/auth/CheckEmail";
import { Skeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.checkEmail");
  return { title: t("metaTitle") };
}

/** Canvas T7b (teacher) and S0b (student) · Check your email. */
export default async function Page({ params, searchParams }: PageProps<"/[locale]/sign-in/check-email">) {
  const t = await getTranslations("auth.checkEmail");
  return (
    <AuthScreen back={{ href: "/sign-in", label: t("back") }}>
      <Suspense fallback={<Skeleton shape="block" />}>
        <WithEmail params={params} searchParams={searchParams} />
      </Suspense>
    </AuthScreen>
  );
}

async function WithEmail({
  params,
  searchParams,
}: Pick<PageProps<"/[locale]/sign-in/check-email">, "params" | "searchParams">) {
  const [{ locale }, { email, role }] = await Promise.all([params, searchParams]);
  if (typeof email !== "string" || !email.includes("@")) redirect({ href: "/sign-in", locale: locale as Locale });
  return <CheckEmail email={email as string} role={role === "student" ? "student" : "teacher"} />;
}
