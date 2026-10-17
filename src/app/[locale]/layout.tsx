import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getDirection, locales } from "@/i18n/locales";
import { themeInitScript } from "@/lib/theme/theme";
import tokens from "../../../design-system/tokens.json";
import "@/styles/globals.css";

// Pre-render every interface language (required by Cache Components).
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
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
