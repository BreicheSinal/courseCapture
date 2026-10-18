import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RoleShell, ShellFallback } from "@/components/layout/RoleShell";
import { ToastProvider } from "@/components/ui/Toast";

/** Every /student page: student accounts only (others are redirected). One toast stack for the area. */
export default async function StudentLayout({ children }: LayoutProps<"/[locale]/student">) {
  const t = await getTranslations("common");
  return (
    <ToastProvider dismissLabel={t("dismiss")}>
      <Suspense fallback={<ShellFallback role="student" />}>
        <RoleShell role="student">{children}</RoleShell>
      </Suspense>
    </ToastProvider>
  );
}
