import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RoleShell, ShellFallback } from "@/components/layout/RoleShell";
import { ToastProvider } from "@/components/ui/Toast";

/** Every /teacher page: approved teachers only (others are redirected). One toast stack for the area. */
export default async function TeacherLayout({ children }: LayoutProps<"/[locale]/teacher">) {
  const t = await getTranslations("common");
  return (
    <ToastProvider dismissLabel={t("dismiss")}>
      <Suspense fallback={<ShellFallback role="teacher" />}>
        <RoleShell role="teacher">{children}</RoleShell>
      </Suspense>
    </ToastProvider>
  );
}
