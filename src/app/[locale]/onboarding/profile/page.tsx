import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/features/auth/AuthScreen";
import { OnboardingForm } from "@/components/features/auth/OnboardingForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.onboarding");
  return { title: t("metaTitle") };
}

/** First sign-in: name (and role if it's missing). */
export default function Page({ searchParams }: PageProps<"/[locale]/onboarding/profile">) {
  return (
    <AuthScreen>
      <Suspense fallback={<Skeleton shape="block" />}>
        <Onboarding searchParams={searchParams} />
      </Suspense>
    </AuthScreen>
  );
}

async function Onboarding({ searchParams }: Pick<PageProps<"/[locale]/onboarding/profile">, "searchParams">) {
  const [{ profile }, { role }] = await Promise.all([requireSession("onboarding-profile"), searchParams]);
  return (
    <OnboardingForm
      defaultName={profile.full_name}
      needsRole={profile.role === null}
      suggestedRole={role === "student" || role === "teacher" ? role : undefined}
    />
  );
}
