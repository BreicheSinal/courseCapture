import { SiteFooter, SiteHeader } from "@/components/features/marketing/SiteChrome";

/** Public pages (#58, #59): `/`, `/privacy`, `/terms`, `/contact`. Prerendered; no auth here. */
export default function MarketingLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
