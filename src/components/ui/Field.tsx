import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Error text; also marks the input invalid. Says what to do. */
  error?: ReactNode;
  size?: "sm" | "md" | "lg";
  inputClassName?: string;
};

/**
 * Labelled text input (design-system Field + Input). The label is always
 * visible and tied to the input; hint and error are linked with aria-describedby.
 */
export function Field({ label, hint, error, size = "md", id, className, inputClassName, ...props }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("cc-field", error ? "is-error" : undefined, className)}>
      <label className="cc-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={cn("cc-input", size !== "md" && `cc-input--${size}`, inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
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
