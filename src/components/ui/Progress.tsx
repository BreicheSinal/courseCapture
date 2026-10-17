import { cn } from "@/lib/utils/cn";

/** Thin progress bar (design-system `cc-progress`). Always pair it with the numbers in text. */
export function Progress({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  /** Names what is measured, e.g. "Photosynthesis class completion". */
  label: string;
  className?: string;
}) {
  // No students or modules yet: nothing to measure (the text beside it says so).
  if (max <= 0) return <div className={cn("cc-progress", className)} aria-hidden="true" />;
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={cn("cc-progress", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
