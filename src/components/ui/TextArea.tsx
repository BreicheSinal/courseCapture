import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  /** Shown under the box at the start, e.g. who sees the text. */
  hint?: ReactNode;
  /** Shown under the box at the end, e.g. "92/500". */
  meta?: ReactNode;
  error?: ReactNode;
};

/** Multi-line text field: Field label and messages around a `cc-input` textarea. */
export function TextArea({ label, hint, meta, error, id, className, rows = 4, ...props }: TextAreaProps) {
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
      <textarea
        id={inputId}
        rows={rows}
        className="cc-input h-auto min-h-28 resize-y py-3"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {(hint || meta) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hint && (
            <span id={hintId} className="cc-field__hint">
              {hint}
            </span>
          )}
          {meta && <span className="cc-field__hint tabular-nums">{meta}</span>}
        </div>
      )}
      {error && (
        <span id={errorId} className="cc-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
