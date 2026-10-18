"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonClasses, Card, EmptyState } from "@/components/ui";

/** Canvas X3 · "Couldn't load" inside the student shell, with a way back to Home. */
export default function StudentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("student.errors");
  return (
    <Card className="max-w-xl">
      <EmptyState
        icon="alert"
        tone="error"
        headingLevel={2}
        title={t("loadTitle")}
        text={t("loadText")}
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              {t("tryAgain")}
            </Button>
            <Link href="/student" className={buttonClasses({ variant: "secondary" })}>
              {t("backHome")}
            </Link>
          </>
        }
      />
    </Card>
  );
}
