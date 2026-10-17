import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FoundationPreview } from "@/components/features/foundation/FoundationPreview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("foundation");
  return { title: t("metaTitle") };
}

/**
 * Stage 1 only: a preview of tokens, themes, languages and the app shell.
 * Replaced in stage 2 by a redirect to sign-in or the person's home.
 */
export default function Page() {
  return <FoundationPreview />;
}
