import type { IconName } from "@/components/ui/Icon";

export type NavRole = "teacher" | "student" | "admin";
export type NavItem = {
  href: string;
  labelKey: "classes" | "courses" | "settings" | "home" | "account" | "teachers" | "invites";
  icon: IconName;
};

/** Three tabs per role (two for admins) (docs/routes.md → Navigation). Same items on the phone tab bar and desktop sidebar. */
export const navItems: Record<NavRole, NavItem[]> = {
  teacher: [
    { href: "/teacher/classes", labelKey: "classes", icon: "classes" },
    { href: "/teacher/courses", labelKey: "courses", icon: "courses" },
    { href: "/teacher/settings", labelKey: "settings", icon: "settings" },
  ],
  student: [
    { href: "/student", labelKey: "home", icon: "home" },
    { href: "/student/classes", labelKey: "classes", icon: "classes" },
    { href: "/student/account", labelKey: "account", icon: "account" },
  ],
  admin: [
    { href: "/admin/teachers", labelKey: "teachers", icon: "classes" },
    { href: "/admin/invites", labelKey: "invites", icon: "key" },
  ],
};

/** True when `pathname` is the item or below it. `/student` only matches exactly. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/student") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
