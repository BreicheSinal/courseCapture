import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getDirection, locales } from "@/i18n/locales";
import { offlineScript } from "@/components/pwa/OfflineNotice";
import { themeInitScript } from "@/lib/theme/theme";
import { siteUrl } from "@/lib/seo";
import tokens from "../../../design-system/tokens.json";
import "@/styles/globals.css";

// Pre-render every interface language (required by Cache Components).
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    // App pages stay out of search results; the public pages opt in (src/lib/seo.ts, #59).
    robots: { index: false, follow: false },
    applicationName: t("appName"),
    // X5 App icon (#37): the design system's icons, in public/.
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    // Installed on iOS: opens full screen with the standard status bar.
    appleWebApp: { capable: true, title: t("appName"), statusBarStyle: "default" },
  };
}

const bg = tokens.color.tokens.find((c) => c.name === "bg")!.value;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser and PWA chrome follow the page background in each theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: bg.light },
    { media: "(prefers-color-scheme: dark)", color: bg.dark },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    // data-theme is set by the inline script before paint, so React must not complain about it.
    <html lang={locale} dir={getDirection(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: offlineScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
