import { Suspense } from "react";
import { RoleShell, ShellFallback } from "@/components/layout/RoleShell";

/** Every /student page: student accounts only (others are redirected). */
export default function StudentLayout({ children }: LayoutProps<"/[locale]/student">) {
  return (
    <Suspense fallback={<ShellFallback role="student" />}>
      <RoleShell role="student">{children}</RoleShell>
    </Suspense>
  );
}
