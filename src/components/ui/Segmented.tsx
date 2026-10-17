import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Option<V extends string> = { value: V; label: ReactNode };

type SegmentedProps<V extends string> = {
  name: string;
  /** Group label for screen readers (e.g. "I am a"). */
  legend: string;
  options: Option<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  className?: string;
};

/**
 * One choice from a few (design-system segmented control, `cc-seg`).
 * Built on native radio inputs, so arrow keys, forms and screen readers work for free.
 * Use size "lg" on touch screens for a 44px target.
 */
export function Segmented<V extends string>({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  size = "md",
  block,
  className,
}: SegmentedProps<V>) {
  return (
    <fieldset className={cn("m-0 border-0 p-0", className)}>
      <legend className="sr-only">{legend}</legend>
      <div className={cn("cc-seg", size !== "md" && `cc-seg--${size}`, block && "cc-seg--block")}>
        {options.map((o) => (
          <label key={o.value} className="cc-seg__opt">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === undefined ? undefined : value === o.value}
              defaultChecked={defaultValue === undefined ? undefined : defaultValue === o.value}
              onChange={() => onChange?.(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
