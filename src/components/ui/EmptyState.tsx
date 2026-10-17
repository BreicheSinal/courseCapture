import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "./Icon";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  /** Says what to do next. */
  text?: string;
  actions?: ReactNode;
  tone?: "default" | "error";
  inline?: boolean;
  headingLevel?: 2 | 3;
};

/** Blank-slate, informational and error states (design-system EmptyState, canvas X2/X3). */
export function EmptyState({
  icon,
  title,
  text,
  actions,
  tone = "default",
  inline,
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn("cc-empty", tone === "error" && "cc-empty--error", inline && "cc-empty--inline")}
      role={tone === "error" ? "alert" : undefined}
    >
      <span className="cc-empty__icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <div className="cc-empty__body">
        <Heading className="cc-empty__title">{title}</Heading>
        {text && <p className="cc-empty__text">{text}</p>}
      </div>
      {actions && <div className="cc-empty__actions">{actions}</div>}
    </div>
  );
}
