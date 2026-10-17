import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  /** Pick by meaning: info for roles/classes, neutral for plain states, success/warning/danger for status. */
  variant?: "info" | "neutral" | "success" | "warning" | "danger" | "solid" | "inverted";
  tint?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

/** Small uppercase pill (design-system Badge). Always a word; colour only reinforces it. */
export function Badge({ variant = "neutral", tint, size = "md", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "cc-badge",
        `cc-badge--${variant}`,
        tint && "cc-badge--tint",
        size !== "md" && `cc-badge--${size}`,
        className,
      )}
    >
      {children}
    </span>
  );
}
