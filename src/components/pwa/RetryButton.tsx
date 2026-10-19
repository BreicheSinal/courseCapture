"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/** Offline page: load the page that was asked for again. */
export function RetryButton() {
  const t = useTranslations("offline");
  return (
    <Button variant="primary" onClick={() => window.location.reload()}>
      {t("retry")}
    </Button>
  );
}
