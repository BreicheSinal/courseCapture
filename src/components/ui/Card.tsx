import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
  /** Stacks children with the system's in-card gap. */
  stack?: boolean;
};

/** Surface container: shadow in Light, hairline border in Dark (design-system rules). */
export function Card({ as: Tag = "div", stack, className, ...props }: CardProps) {
  return <Tag className={cn("cc-card", stack && "cc-card--stack", className)} {...props} />;
}
