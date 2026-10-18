import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

/**
 * Screen title row for teacher screens: optional back link (44px, flips in RTL),
 * the page's h1, a muted line under it, and actions at the end.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  size = "title",
  titleAs: Title = "h1",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** `large` for top-level screens (Classes, Courses, Settings). */
  size?: "title" | "large";
  /** `p` when the page's h1 is further down (T3/T4: the course or module title is the heading). */
  titleAs?: "h1" | "p";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            className="grid size-control flex-none place-items-center rounded-sm border border-line-strong bg-surface text-ink"
          >
            <Icon name="chevronBack" width={18} height={18} />
          </Link>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <Title id={Title === "h1" ? "page-title" : undefined} tabIndex={-1} className={cn(size === "large" ? "large-title" : "headline", "focus:outline-none")}>
            {title}
          </Title>
          {subtitle && <p className="subhead text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
