/**
 * Test harness for migrations and RLS against a real Postgres.
 *
 * Creates a throwaway database, loads the Supabase auth shim and every
 * migration in order, and gives helpers to act as a user. Needs
 * TEST_DATABASE_URL (an admin connection, e.g. postgres://postgres:postgres@localhost:5432/postgres).
 * With Supabase running locally you can point it at that instead.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";

export type Db = {
  client: Client;
  /** Runs `fn` as an authenticated user (or anon when uid is null), inside a rolled-back transaction. */
  as<T>(uid: string | null, fn: (c: Client) => Promise<T>): Promise<T>;
  /** Creates an auth user (fires the profile trigger) and returns its id. Confirmed by default. */
  createUser(email: string, meta?: Record<string, unknown>, opts?: { confirmed?: boolean }): Promise<string>;
  /** Runs `fn` as `uid` and commits (for setup that later steps must see). */
  commitAs<T>(uid: string, fn: (c: Client) => Promise<T>): Promise<T>;
  drop(): Promise<void>;
};

export async function createTestDb(): Promise<Db> {
  const name = `cc_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  const root = process.cwd();
  await client.query(readFileSync(join(root, "supabase/tests/helpers/auth-shim.sql"), "utf8"));
  const migrations = readdirSync(join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const m of migrations) await client.query(readFileSync(join(root, "supabase/migrations", m), "utf8"));

  return {
    client,
    async as(uid, fn) {
      await client.query("begin");
      try {
        await client.query(`set local role ${uid ? "authenticated" : "anon"}`);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
        return await fn(client);
      } finally {
        await client.query("rollback");
      }
    },
    async createUser(email, meta = {}, { confirmed = true } = {}) {
      const r = await client.query(
        "insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ($1, $2, $3) returning id",
        [email, meta, confirmed ? new Date() : null],
      );
      return r.rows[0].id as string;
    },
    async commitAs(uid, fn) {
      await client.query("begin");
      try {
        await client.query("set local role authenticated");
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
        const out = await fn(client);
        await client.query("commit");
        return out;
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    },
    async drop() {
      await client.end();
      await admin.query(`drop database if exists ${name} with (force)`);
      await admin.end();
    },
  };
}

/** Runs a statement and returns the Postgres error message, or null if it succeeded. */
export async function errorOf(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
