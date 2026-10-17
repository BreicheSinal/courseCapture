"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Card, EmptyState } from "@/components/ui";

/** Canvas X3 · Error states — shown when a page fails to render. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon="alert"
          tone="error"
          headingLevel={2}
          title={t("errorTitle")}
          text={t("errorText")}
          actions={
            <Button variant="primary" onClick={reset}>
              {t("tryAgain")}
            </Button>
          }
        />
      </Card>
    </AppShell>
  );
}
