import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { RetryButton } from "@/components/pwa/RetryButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * Shown by the service worker when there's no connection and the page wasn't
 * saved for offline reading (#37). Fully static: it's saved when the worker installs.
 */
export default async function Page() {
  const t = await getTranslations("offline");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Card as="section" aria-labelledby="offline-title" className="flex flex-col items-start gap-4">
        <span
          className="grid size-control place-items-center rounded-full bg-surface-sunken text-ink-muted"
          aria-hidden="true"
        >
          <Icon name="alert" />
        </span>
        <h1 id="offline-title" className="title">
          {t("title")}
        </h1>
        <p className="body text-ink-muted">{t("text")}</p>
        <RetryButton />
      </Card>
    </main>
  );
}
