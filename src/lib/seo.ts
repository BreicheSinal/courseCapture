import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/locales";

/** Public pages, listed in the sitemap and indexed (#59). Paths without the locale. */
export const publicPaths = ["", "/privacy", "/terms", "/contact"] as const;
export type PublicPath = (typeof publicPaths)[number];

export const siteUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** hreflang alternates and the canonical URL for one public page. */
export function alternates(locale: Locale, path: PublicPath): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/en${path}`,
    },
  };
}

/** src/app/[locale]/opengraph-image.tsx. Named explicitly: a page's own openGraph replaces the inherited one. */
const ogImage = (locale: Locale) => ({ url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: "CourseCapture" });

/** Metadata for a public page: indexed, with alternates and the social preview (opengraph-image). */
export function publicMetadata(locale: Locale, path: PublicPath, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: alternates(locale, path),
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "CourseCapture",
      title,
      description,
      locale,
      url: `/${locale}${path}`,
      images: [ogImage(locale)],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(locale)] },
  };
}
