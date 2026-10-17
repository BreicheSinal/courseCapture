import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { buttonClasses, Card, EmptyState } from "@/components/ui";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <AppShell>
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon="alert"
          headingLevel={2}
          title={t("notFoundTitle")}
          text={t("notFoundText")}
          actions={
            <Link href="/" className={buttonClasses({ variant: "primary" })}>
              {t("goHome")}
            </Link>
          }
        />
      </Card>
    </AppShell>
  );
}
