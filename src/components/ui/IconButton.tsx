import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "./Icon";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** Names the action and its target, e.g. "Copy join code". Also used as the tooltip. */
  label: string;
  size?: "md" | "xs";
};

/** A bordered icon-only tool (design-system IconButton). Never the main action of a view. */
export function IconButton({ icon, label, size = "md", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn("cc-iconbtn", size === "xs" && "cc-iconbtn--xs", className)}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
