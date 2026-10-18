import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Prompts are read from disk at runtime (src/lib/ai/prompts.ts); ship them with every server function.
  outputFileTracingIncludes: { "/**": ["./ai/prompts/*.md"] },
  // Parsers that load their own workers or WebAssembly stay out of the bundle.
  serverExternalPackages: ["unpdf", "pdf-lib"],
  experimental: {
    // Uploads go straight to Storage; this only covers pasted text (FR-8).
    serverActions: { bodySizeLimit: "1mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
