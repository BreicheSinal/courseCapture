import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, errorOf, type Db } from "./harness";

// #59: the contact form's rate limit. Only the server may use it; nobody can read it.

let db: Db;
let teacher: string;
const sender = "a".repeat(64);

beforeAll(async () => {
  db = await createTestDb();
  teacher = await db.createUser("rahme@school.edu", { role: "teacher", full_name: "Nadia Rahme" });
}, 30_000);

afterAll(async () => {
  await db?.drop();
});

describe("contact rate limit", () => {
  it("allows p_limit messages per window, then refuses", async () => {
    const results = await db.asService(async (c) => {
      const out: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        out.push((await c.query("select public.claim_contact_slot($1, 3, interval '1 hour') as ok", [sender])).rows[0].ok);
      }
      // A different sender isn't affected.
      out.push((await c.query("select public.claim_contact_slot($1, 3, interval '1 hour') as ok", ["b".repeat(64)])).rows[0].ok);
      return out;
    });
    expect(results).toEqual([true, true, true, false, true]);
  });

  it("forgets attempts older than the window", async () => {
    const ok = await db.asService(async (c) => {
      await c.query("insert into public.contact_attempts (sender_hash, created_at) select $1, now() - interval '2 hours' from generate_series(1, 5)", [sender]);
      return (await c.query("select public.claim_contact_slot($1, 3, interval '1 hour') as ok", [sender])).rows[0].ok;
    });
    expect(ok).toBe(true);
  });

  it("rejects malformed senders", async () => {
    expect(await errorOf(db.asService((c) => c.query("select public.claim_contact_slot('short', 3, interval '1 hour')")))).toMatch(/bad_request/);
  });

  it("is closed to visitors and signed-in people", async () => {
    for (const uid of [null, teacher]) {
      expect(await errorOf(db.as(uid, (c) => c.query("select public.claim_contact_slot($1, 3, interval '1 hour')", [sender])))).toMatch(/permission denied/);
      expect(await errorOf(db.as(uid, (c) => c.query("select * from public.contact_attempts")))).toMatch(/permission denied/);
      expect(await errorOf(db.as(uid, (c) => c.query("insert into public.contact_attempts (sender_hash) values ($1)", [sender])))).toMatch(/permission denied/);
    }
  });
});
