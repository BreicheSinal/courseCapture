import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { publicPaths, siteUrl } from "@/lib/seo";

/** sitemap.xml (#59): the public pages in every language, with hreflang alternates. App routes stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return publicPaths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.5,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
