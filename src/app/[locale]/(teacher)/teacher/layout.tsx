import { Suspense } from "react";
import { RoleShell, ShellFallback } from "@/components/layout/RoleShell";

/** Every /teacher page: approved teachers only (others are redirected). */
export default function TeacherLayout({ children }: LayoutProps<"/[locale]/teacher">) {
  return (
    <Suspense fallback={<ShellFallback role="teacher" />}>
      <RoleShell role="teacher">{children}</RoleShell>
    </Suspense>
  );
}
