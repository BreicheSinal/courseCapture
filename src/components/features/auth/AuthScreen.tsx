import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { cn } from "@/lib/utils/cn";

/**
 * Frame for the signed-out and onboarding screens (canvas T7–T7e, S0b):
 * a narrow centred column, optional back link, and a language picker at the foot.
 */
export function AuthScreen({
  back,
  children,
  footer,
}: {
  back?: { href: string; label: string };
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-2 pb-6">
      <header className="flex min-h-15 items-center">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            className="grid size-11 place-items-center rounded-sm border border-line-strong bg-surface text-ink"
          >
            <Icon name="chevronBack" width={17} height={17} />
          </Link>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col gap-6 pt-2 focus:outline-none">
        {children}
      </main>
      <footer className="mt-8 flex flex-col items-center gap-4">
        {footer}
        <LanguageSelect hideLabel className="w-44" />
        <span className="sr-only">{t("appName")}</span>
      </footer>
    </div>
  );
}

/** Round icon + optional eyebrow + title + text, centred (the canvas's screen heading pattern). */
export function AuthHeading({
  icon,
  tone = "accent",
  eyebrow,
  title,
  children,
}: {
  icon: IconName;
  tone?: "accent" | "warning";
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-18 place-items-center rounded-pill",
          tone === "accent" ? "bg-accent-soft text-accent-text" : "border-2 border-warning text-warning",
        )}
      >
        <Icon name={icon} width={32} height={32} />
      </span>
      {eyebrow && <p className={cn("eyebrow", tone === "accent" ? "text-accent-text" : "text-warning")}>{eyebrow}</p>}
      <h1 className="title">{title}</h1>
      {children}
    </div>
  );
}
