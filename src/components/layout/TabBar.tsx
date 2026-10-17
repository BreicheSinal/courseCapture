"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { isActive, navItems, type NavRole } from "./nav";

/**
 * Phone bottom tab bar: three tabs (two for admins), 52px targets (canvas note; not yet in the design system).
 * Hidden on desktop, where Sidebar shows the same items.
 */
export function TabBar({ role }: { role: NavRole }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("common.mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="m-0 grid list-none auto-cols-fr grid-flow-col p-0">
        {navItems[role].map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "caption flex min-h-13 flex-col items-center justify-center gap-1 no-underline",
                  active ? "font-semibold text-accent-text" : "text-ink-muted",
                )}
              >
                <Icon name={item.icon} width={22} height={22} />
                {t(`nav.${item.labelKey}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
