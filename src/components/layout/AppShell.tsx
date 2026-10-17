import type { ComponentProps, ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import type { NavRole } from "./nav";

type AppShellProps = {
  role?: NavRole;
  person?: ComponentProps<typeof AppHeader>["person"];
  /** Account menu shown in the header (signed-in screens). */
  menu?: ReactNode;
  children: ReactNode;
};

/**
 * Page frame used by every signed-in screen.
 * Phone: header, content, bottom tab bar. Desktop (lg+): header, sidebar at the start edge, content.
 */
export function AppShell({ role, person, menu, children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-dvh max-w-360">
      <AppHeader person={person} menu={menu} />
      <div className="flex gap-8 px-4 pb-24 lg:pb-12">
        {role && <Sidebar role={role} />}
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
      {role && <TabBar role={role} />}
    </div>
  );
}
