import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/features/auth/AuthScreen";
import { OfflineIdentity } from "@/components/pwa/OfflineSupport";
import { SignInForm } from "@/components/features/auth/SignInForm";
import type { AuthErrorKey } from "@/lib/auth/actions";
import { guard } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("metaTitle") };
}

const knownErrors = new Set(["linkExpired"]);

/** Canvas T7 · Sign in. The form renders instantly; a signed-in visitor is sent home. */
export default function Page({ searchParams }: PageProps<"/[locale]/sign-in">) {
  return (
    <AuthScreen>
      {/* Signed out: saved offline pages are deleted (#37). */}
      <OfflineIdentity user={null} />
      <Suspense fallback={<SignInForm configured={isSupabaseConfigured} />}>
        <SignedOutOnly searchParams={searchParams} />
      </Suspense>
    </AuthScreen>
  );
}

async function SignedOutOnly({ searchParams }: { searchParams: PageProps<"/[locale]/sign-in">["searchParams"] }) {
  if (isSupabaseConfigured) await guard("sign-in");
  const { error } = await searchParams;
  const initialError = typeof error === "string" && knownErrors.has(error) ? (error as AuthErrorKey) : undefined;
  return <SignInForm configured={isSupabaseConfigured} initialError={initialError} />;
}
