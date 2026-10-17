"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * T6 · Courses / Roster / Announcements. Each section has its own URL, so these
 * are navigation links styled as tabs (design-system Tabs; selected = current page).
 */
export function ClassTabs({ classId }: { classId: string }) {
  const t = useTranslations("teacher.classPage");
  const pathname = usePathname();
  const base = `/teacher/classes/${classId}`;
  const items = [
    { href: base, label: t("tabCourses"), match: (p: string) => p === base || p.startsWith(`${base}/edit`) || p.startsWith(`${base}/delete`) },
    { href: `${base}/students`, label: t("tabRoster"), match: (p: string) => p.startsWith(`${base}/students`) },
    { href: `${base}/announcements`, label: t("tabAnnouncements"), match: (p: string) => p.startsWith(`${base}/announcements`) },
  ];
  return (
    <nav aria-label={t("sections")} className="cc-tabs">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="cc-tab" aria-current={i.match(pathname) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
