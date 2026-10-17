import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "warning" | "danger";
export type ButtonSize = "tiny" | "sm" | "md" | "lg";

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon-only shape. Requires `aria-label` naming the action ("Copy join code"). */
  shape?: "square" | "circle" | "pill";
  block?: boolean;
};

/** Design-system classes for a button; also used to style a Link as a button. */
export function buttonClasses({ variant = "secondary", size = "md", shape, block }: ButtonStyleProps = {}) {
  return cn(
    "cc-btn",
    `cc-btn--${variant}`,
    size !== "md" && `cc-btn--${size}`,
    shape && `cc-btn--${shape}`,
    block && "cc-btn--block",
  );
}

type ButtonProps = ButtonStyleProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Shows a spinner and marks the button busy. Change the label to what is happening. */
    busy?: boolean;
    children: ReactNode;
  };

/**
 * The single control for every action (design-system Button).
 * One `primary` per view. Labels name the outcome in sentence case.
 */
export function Button({
  variant,
  size,
  shape,
  block,
  busy,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      className={cn(buttonClasses({ variant, size, shape, block }), className)}
      {...props}
    >
      {busy && <span className="cc-btn__spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
