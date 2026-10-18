import { defineConfig, devices } from "@playwright/test";
import jwt from "./tests/e2e/stack/jwt.cjs";

const { anonKey, serviceKey } = jwt;

/**
 * End-to-end tests (tests/e2e/README.md). Runs the app against the Supabase
 * stand-in (real Postgres + migrations, so RLS applies) and the fake AI
 * provider, with jobs running inline (no Inngest).
 */
const db = `${(process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres").replace(/\/[^/]*$/, "")}/${process.env.E2E_DB ?? "cc_e2e"}`;
const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    launchOptions: process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/stack/supabase-standin.mjs",
      port: 54321,
      reuseExistingServer: true,
      env: { DATABASE_URL: db, PORT: "54321" },
    },
    {
      command: `pnpm exec next dev --port ${port}`,
      port,
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
        NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
        AI_PROVIDER: "fake",
        AI_API_KEY: "",
        INNGEST_EVENT_KEY: "",
        INNGEST_DEV: "",
        AI_DAILY_GENERATIONS_PER_TEACHER: "20",
      },
    },
  ],
});
