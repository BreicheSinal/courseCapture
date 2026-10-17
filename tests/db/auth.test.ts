import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, errorOf, type Db } from "./harness";

let db: Db;
let admin: string;

beforeAll(async () => {
  db = await createTestDb();
  // The first admin is set by hand in SQL (docs/auth-and-roles.md).
  admin = await db.createUser("admin@school.edu", { full_name: "J. Haddad" });
  await db.client.query("update public.profiles set role = 'admin', status = 'approved' where id = $1", [admin]);
}, 30_000);

afterAll(async () => {
  await db?.drop();
});

const profileOf = async (id: string) =>
  (await db.client.query("select * from public.profiles where id = $1", [id])).rows[0];

describe("new users", () => {
  it("creates an approved student from sign-in metadata", async () => {
    const id = await db.createUser("maya@school.edu", { role: "student", locale: "ar" });
    const p = await profileOf(id);
    expect(p.role).toBe("student");
    expect(p.status).toBe("approved");
    expect(p.ui_locale).toBe("ar");
  });

  it("creates a pending teacher", async () => {
    const id = await db.createUser("rahme@school.edu", { role: "teacher", full_name: "Nadia Rahme" });
    const p = await profileOf(id);
    expect([p.role, p.status, p.full_name]).toEqual(["teacher", "pending", "Nadia Rahme"]);
  });

  it("never grants admin from metadata", async () => {
    const id = await db.createUser("sneaky@school.edu", { role: "admin" });
    const p = await profileOf(id);
    expect(p.role).toBeNull();
    expect(p.status).toBe("pending");
  });
});

describe("profiles RLS", () => {
  it("lets a user read only their own profile", async () => {
    const a = await db.createUser("a@x.edu", { role: "student" });
    await db.createUser("b@x.edu", { role: "student" });
    const rows = await db.as(a, async (c) => (await c.query("select id from public.profiles")).rows);
    expect(rows.map((r) => r.id)).toEqual([a]);
  });

  it("hides everything from signed-out visitors", async () => {
    expect(await errorOf(db.as(null, (c) => c.query("select * from public.profiles")))).toMatch(/permission denied/);
  });

  it("lets admins read every profile", async () => {
    const rows = await db.as(admin, async (c) => (await c.query("select count(*)::int as n from public.profiles")).rows);
    expect(rows[0].n).toBeGreaterThan(1);
  });

  it("lets a user change their name, language and theme", async () => {
    const id = await db.createUser("c@x.edu", { role: "student" });
    await db.as(id, async (c) => {
      await c.query("update public.profiles set full_name = 'Omar', ui_locale = 'fr', theme = 'dark' where id = $1", [
        id,
      ]);
      const r = await c.query("select full_name, ui_locale, theme from public.profiles where id = $1", [id]);
      expect(r.rows[0]).toEqual({ full_name: "Omar", ui_locale: "fr", theme: "dark" });
    });
  });

  it("blocks a user from changing their own role or status", async () => {
    const id = await db.createUser("d@x.edu", { role: "teacher" });
    expect(await errorOf(db.as(id, (c) => c.query("update public.profiles set status = 'approved' where id = $1", [id])))).toMatch(
      /permission denied/,
    );
    expect(await errorOf(db.as(id, (c) => c.query("update public.profiles set role = 'admin' where id = $1", [id])))).toMatch(
      /permission denied/,
    );
  });

  it("does not let a user edit someone else's profile", async () => {
    const me = await db.createUser("e@x.edu", { role: "student" });
    const other = await db.createUser("f@x.edu", { role: "student" });
    await db.as(me, async (c) => {
      const r = await c.query("update public.profiles set full_name = 'Hacked' where id = $1", [other]);
      expect(r.rowCount).toBe(0);
    });
  });
});

describe("onboarding", () => {
  it("sets the name and a missing role once", async () => {
    const id = await db.createUser("g@x.edu");
    await db.as(id, async (c) => {
      const r = await c.query("select role, status, full_name from public.complete_onboarding('Lina', 'student')");
      expect(r.rows[0]).toEqual({ role: "student", status: "approved", full_name: "Lina" });
      const again = await c.query("select role from public.complete_onboarding('Lina K', 'teacher')");
      expect(again.rows[0].role).toBe("student");
    });
  });

  it("rejects admin as a chosen role and empty names", async () => {
    const id = await db.createUser("h@x.edu");
    expect(await errorOf(db.as(id, (c) => c.query("select public.complete_onboarding('X', 'admin')")))).toMatch(
      /role_required/,
    );
    expect(await errorOf(db.as(id, (c) => c.query("select public.complete_onboarding('  ', 'student')")))).toMatch(
      /invalid_name/,
    );
  });
});

describe("teacher invites", () => {
  it("only admins can create invites", async () => {
    const t = await db.createUser("t1@x.edu", { role: "teacher" });
    expect(await errorOf(db.as(t, (c) => c.query("select public.create_teacher_invite('Cedar Hill')")))).toMatch(
      /not_allowed/,
    );
  });

  it("checks, redeems once and approves the teacher", async () => {
    // Create as admin, committed so other users can see it.
    await db.client.query("begin");
    await db.client.query("set local role authenticated");
    await db.client.query("select set_config('request.jwt.claim.sub', $1, true)", [admin]);
    const code = (await db.client.query("select code from public.create_teacher_invite('Cedar Hill High School')")).rows[0]
      .code as string;
    await db.client.query("commit");
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const dashed = `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`;

    const t = await db.createUser("t2@x.edu", { role: "teacher" });
    const check = await db.as(t, async (c) => (await c.query("select * from public.check_teacher_invite($1)", [dashed])).rows);
    expect(check).toEqual([{ school_name: "Cedar Hill High School", invited_by: "J. Haddad" }]);

    await db.client.query("begin");
    await db.client.query("set local role authenticated");
    await db.client.query("select set_config('request.jwt.claim.sub', $1, true)", [t]);
    const p = (await db.client.query("select status, approved_via_invite from public.redeem_teacher_invite($1)", [dashed]))
      .rows[0];
    await db.client.query("commit");
    expect(p).toEqual({ status: "approved", approved_via_invite: code });

    // Single use: a second teacher can't use it.
    const t3 = await db.createUser("t3@x.edu", { role: "teacher" });
    expect(await db.as(t3, async (c) => (await c.query("select * from public.check_teacher_invite($1)", [code])).rows)).toEqual(
      [],
    );
    expect(await errorOf(db.as(t3, (c) => c.query("select public.redeem_teacher_invite($1)", [code])))).toMatch(
      /invalid_invite/,
    );
  });

  it("does not let students use invite codes or read invites", async () => {
    const s = await db.createUser("s9@x.edu", { role: "student" });
    expect(await errorOf(db.as(s, (c) => c.query("select public.redeem_teacher_invite('ABCDEFGH')")))).toMatch(
      /not_a_teacher/,
    );
    const rows = await db.as(s, async (c) => (await c.query("select * from public.teacher_invites")).rows);
    expect(rows).toEqual([]);
  });
});

describe("approval", () => {
  it("lets admins approve and reject teachers, and no one else", async () => {
    const t = await db.createUser("t4@x.edu", { role: "teacher" });
    const other = await db.createUser("t5@x.edu", { role: "teacher" });
    expect(
      await errorOf(db.as(other, (c) => c.query("select public.set_teacher_status($1, 'approved')", [t]))),
    ).toMatch(/not_allowed/);
    const r = await db.as(admin, async (c) => (await c.query("select status from public.set_teacher_status($1, 'rejected')", [t])).rows);
    expect(r[0].status).toBe("rejected");
  });

  it("refuses to change a student's status", async () => {
    const s = await db.createUser("s10@x.edu", { role: "student" });
    expect(await errorOf(db.as(admin, (c) => c.query("select public.set_teacher_status($1, 'rejected')", [s])))).toMatch(
      /not_a_teacher/,
    );
  });
});
