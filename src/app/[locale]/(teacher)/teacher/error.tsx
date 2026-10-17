"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonClasses, Card, EmptyState } from "@/components/ui";

/** Canvas X3 · "Couldn't load" inside the teacher shell, with a way back to Classes. */
export default function TeacherError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("teacher.errors");
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
            <Link href="/teacher/classes" className={buttonClasses({ variant: "secondary" })}>
              {t("backToClasses")}
            </Link>
          </>
        }
      />
    </Card>
  );
}
