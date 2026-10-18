import { useFormatter } from "next-intl";
import { cn } from "@/lib/utils/cn";

/**
 * Numbered step bars for a short flow (canvas T1–T5 "1 · Source, 2 · Generate,
 * 3 · Review & assign"). Steps before `current` are done, `current` is marked
 * with aria-current. The number is text, so the state never depends on colour.
 */
export function Steps({
  label,
  steps,
  current,
  className,
}: {
  label: string;
  steps: string[];
  current: number;
  className?: string;
}) {
  const format = useFormatter();
  return (
    <ol aria-label={label} className={cn("cc-steps", className)}>
      {steps.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={cn("cc-steps__item", i < current && "is-done", i === current && "is-current")}
        >
          <span className="cc-steps__bar" aria-hidden="true" />
          <span className="cc-steps__label">
            {format.number(i + 1)} · {s}
          </span>
        </li>
      ))}
    </ol>
  );
}
