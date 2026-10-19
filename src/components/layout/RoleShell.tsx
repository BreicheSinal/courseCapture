import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import { OfflineIdentity } from "@/components/pwa/OfflineSupport";
import { AccountMenu } from "./AccountMenu";
import { AppShell } from "./AppShell";
import type { NavRole } from "./nav";

/**
 * Signed-in frame for one role's area. Checks the session on the server
 * (redirecting anyone who doesn't belong) and renders the shell with the
 * account menu. Render it inside <Suspense>: it reads cookies.
 */
export async function RoleShell({ role, children }: { role: NavRole; children: ReactNode }) {
  const { profile } = await requireSession(role);
  const name = profile.full_name || profile.email;
  return (
    <AppShell role={role} menu={<AccountMenu name={name} role={profile.role ?? role} />}>
      <OfflineIdentity user={profile.id} />
      <OfflineNotice student={role === "student"} />
      {children}
    </AppShell>
  );
}

/** What the shell shows while the session loads: the same frame, empty. */
export function ShellFallback({ role }: { role: NavRole }) {
  return <AppShell role={role}>{null}</AppShell>;
}
