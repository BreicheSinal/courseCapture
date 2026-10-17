import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./Icon";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** Visible label. Omit only when `aria-label` names the select. */
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

/** Native dropdown for a short fixed list (design-system Select), inside a Field when labelled. */
export function Select({ label, hint, error, size = "md", id, className, children, ...props }: SelectProps) {
  const auto = useId();
  const selectId = id ?? auto;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;
  const describedBy = [hint && !error && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const control = (
    <div className="cc-select">
      <select
        id={selectId}
        className={cn("cc-input", size !== "md" && `cc-input--${size}`)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
      <Icon name="chevronDown" className="cc-select__chev" />
    </div>
  );
  if (!label) return <div className={className}>{control}</div>;
  return (
    <div className={cn("cc-field", error ? "is-error" : undefined, className)}>
      <label className="cc-field__label" htmlFor={selectId}>
        {label}
      </label>
      {control}
      {hint && !error && (
        <span id={hintId} className="cc-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="cc-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
