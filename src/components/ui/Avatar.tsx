import { cn } from "@/lib/utils/cn";

type AvatarProps = {
  name: string;
  /** Solid for the signed-in person, soft for other people, neutral for unknown or counts. */
  tone?: "self" | "soft" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** First-initial circle (design-system Avatar). */
export function Avatar({ name, tone = "self", size = "md", className }: AvatarProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase() || "?";
  return (
    <span
      role="img"
      aria-label={name}
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
