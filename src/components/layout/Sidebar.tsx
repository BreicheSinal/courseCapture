"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { isActive, navItems, type NavRole } from "./nav";

/** Desktop navigation at the start edge (left in LTR, right in RTL). Hidden on phones. */
export function Sidebar({ role }: { role: NavRole }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav aria-label={t("common.mainNavigation")} className="hidden w-60 shrink-0 lg:block">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {navItems[role].map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "subhead flex min-h-control items-center gap-3 rounded-md px-3 no-underline",
                  active ? "bg-accent-soft font-semibold text-accent-text" : "text-ink hover:bg-surface-sunken",
                )}
              >
                <Icon name={item.icon} width={18} height={18} />
                {t(`nav.${item.labelKey}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
