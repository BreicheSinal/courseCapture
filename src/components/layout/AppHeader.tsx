import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

type AppHeaderProps = {
  /** Signed-in person; omitted when signed out. */
  person?: { name: string; role: "teacher" | "student" | "admin" };
  /** Replaces the static person chip, e.g. with the AccountMenu (X1). */
  menu?: ReactNode;
};

/** Top bar of every screen (design-system AppHeader): wordmark at the start, the person at the end. */
export function AppHeader({ person, menu }: AppHeaderProps) {
  const t = useTranslations();
  return (
    <header className="cc-header px-4 pt-4 pb-6">
      <Link href="/" className="cc-wordmark inline-flex min-h-control items-center no-underline" dir="ltr">
        Course<span>Capture</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        {menu}
        {!menu && person && (
          <div className="cc-chip min-w-0">
            <Avatar name={person.name} />
            <span className="truncate">{person.name}</span>
            <Badge variant="info">{t(`roles.${person.role}`)}</Badge>
          </div>
        )}
      </div>
    </header>
  );
}
