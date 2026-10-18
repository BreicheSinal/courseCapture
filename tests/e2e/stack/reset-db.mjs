#!/usr/bin/env node
/**
 * Recreates the end-to-end database: the Supabase auth shim plus every
 * migration, exactly as tests/db/harness.ts does. Run before `pnpm test:e2e`
 * (playwright.config.ts does it in globalSetup).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const admin = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const name = process.env.E2E_DB ?? "cc_e2e";

export async function resetDb() {
  const a = new pg.Client({ connectionString: admin });
  await a.connect();
  await a.query(`drop database if exists ${name} with (force)`);
  await a.query(`create database ${name}`);
  await a.end();
  const url = new URL(admin);
  url.pathname = `/${name}`;
  const c = new pg.Client({ connectionString: url.toString() });
  await c.connect();
  const root = process.cwd();
  await c.query(readFileSync(join(root, "supabase/tests/helpers/auth-shim.sql"), "utf8"));
  for (const f of readdirSync(join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await c.query(readFileSync(join(root, "supabase/migrations", f), "utf8"));
  }
  await c.end();
  return url.toString();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetDb().then((u) => console.log(`Reset ${u}`));
}
