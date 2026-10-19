import type { MetadataRoute } from "next";
import tokens from "../../design-system/tokens.json";

/**
 * Web app manifest (X5 App icon, issue #37): lets phones and computers install
 * CourseCapture. Icons come from the design system (design-system/assets/AppIcons,
 * copied to public/). Colours come from the tokens, so they follow the design system.
 * Opening the installed app goes to `/app`, which sends each person to their home
 * (`/` is the marketing page, #58). `id` stays `/` so existing installs keep working.
 */
const color = (name: string) => tokens.color.tokens.find((c) => c.name === name)!.value;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CourseCapture",
    short_name: "CourseCapture",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    dir: "auto",
    // The splash screen (X6) on Android is built from these, the icon and the name.
    background_color: color("bg").light,
    theme_color: color("bg").light,
    categories: ["education"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
