import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { RetryButton } from "@/components/pwa/RetryButton";
import { Card, EmptyState } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * Shown by the service worker when there's no connection and the page wasn't
 * saved for offline reading (#37). Same frame as "Page not found"; fully static,
 * so it's saved when the worker installs.
 */
export default async function Page() {
  const t = await getTranslations("offline");
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl">
        <EmptyState icon="alert" headingLevel={1} title={t("title")} text={t("text")} actions={<RetryButton />} />
      </Card>
    </AppShell>
  );
}
