import { execFileSync } from "node:child_process";

/** Fresh database with every migration before each run (tests/e2e/stack/reset-db.mjs). */
export default async function globalSetup() {
  execFileSync(process.execPath, ["tests/e2e/stack/reset-db.mjs"], { stdio: "inherit" });
}
