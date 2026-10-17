import { cn } from "@/lib/utils/cn";

type SkeletonProps = {
  shape?: "line" | "title" | "block" | "pill" | "round";
  className?: string;
};

/** Loading placeholder (design-system Skeleton). The shimmer stops under reduced motion. */
export function Skeleton({ shape = "line", className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn("cc-skel", shape !== "line" && `cc-skel--${shape}`, className)} />;
}
