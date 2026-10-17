import { Suspense } from "react";
import { RoleShell, ShellFallback } from "@/components/layout/RoleShell";

/** Every /admin page: approved admins only. The database also checks is_admin() on every action. */
export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <Suspense fallback={<ShellFallback role="admin" />}>
      <RoleShell role="admin">{children}</RoleShell>
    </Suspense>
  );
}
