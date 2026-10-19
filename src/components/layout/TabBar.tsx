"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { isActive, navItems, type NavRole } from "./nav";

/**
 * Design-system TabBar (design-system/components/TabBar): the phone's bottom navigation,
 * three tabs (two for admins), 52px targets. Hidden on desktop, where Sidebar shows the same items.
 */
export function TabBar({ role }: { role: NavRole }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav aria-label={t("common.mainNavigation")} className="cc-tabbar lg:hidden">
      <ul className="cc-tabbar__list">
        {navItems[role].map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className="cc-tabbar__tab">
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
