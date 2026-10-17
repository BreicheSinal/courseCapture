import { defineConfig } from "vitest/config";

// Database tests: migrations + RLS against a real Postgres (see tests/db/harness.ts).
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
