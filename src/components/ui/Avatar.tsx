import { cn } from "@/lib/utils/cn";

type AvatarProps = {
  name: string;
  /** Solid for the signed-in person, soft for other people, neutral for unknown or counts. */
  tone?: "self" | "soft" | "neutral";
  size?: "sm" | "md" | "lg";
  /** Hide from screen readers when the name is already written next to it. */
  decorative?: boolean;
  className?: string;
};

/** First-initial circle (design-system Avatar). */
export function Avatar({ name, tone = "self", size = "md", decorative, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase() || "?";
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={cn(
        "cc-avatar",
        tone !== "self" && `cc-avatar--${tone}`,
        size !== "md" && `cc-avatar--${size}`,
        className,
      )}
    >
      {initial}
    </span>
  );
}
