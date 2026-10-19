import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { siteUrl } from "@/lib/seo";

/** robots.txt (#59): crawl the public pages; keep the app, API and auth routes out. App pages also send noindex. */
export default function robots(): MetadataRoute.Robots {
  const app = ["app", "teacher", "student", "admin", "onboarding", "sign-in", "wrong-account", "offline", "design"];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", ...locales.flatMap((l) => app.map((p) => `/${l}/${p}`))],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
