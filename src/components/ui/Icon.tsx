import type { SVGProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Stroke icons on a 24px grid (design system: 1.8px stroke, round caps, currentColor).
 * Size and stroke come from the component that holds the icon (cc-btn, cc-iconbtn…).
 * Directional icons flip in right-to-left languages.
 */
const paths = {
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5",
  copy: "M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z M5 15V6a2 2 0 0 1 2-2h9",
  refresh: "M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5",
  plus: "M12 5v14M5 12h14",
  arrowForward: "M5 12h14M13 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  home: "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10",
  classes:
    "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M2.5 20c.6-4 3.2-6 6.5-6s5.9 2 6.5 6 M16 5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3.3 2.4 3.5 6",
  courses: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 21V5M8 7h7",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  account: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21c.8-4.5 4-7 8-7s7.2 2.5 8 7",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  monitor: "M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 20h8M12 16v4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z",
  alert: "M12 3l10 18H2z M12 10v4M12 17.5v.5",
} as const;

export type IconName = keyof typeof paths;

const directional: ReadonlySet<IconName> = new Set(["arrowForward"]);

export function Icon({ name, className, ...props }: { name: IconName } & Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(directional.has(name) && "cc-flip-rtl", className)}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
