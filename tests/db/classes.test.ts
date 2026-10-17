import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, errorOf, type Db } from "./harness";

let db: Db;
let teacher: string; // approved, owns Biology
let other: string; // approved, owns Chemistry
let pending: string; // pending teacher
let student: string; // in Biology
let outsider: string; // student in no class
let biology: { id: string; join_code: string };
let chemistry: { id: string; join_code: string };

const q = (sql: string, params: unknown[] = []) => db.client.query(sql, params);

beforeAll(async () => {
  db = await createTestDb();
  teacher = await db.createUser("rahme@school.edu", { role: "teacher", full_name: "Nadia Rahme" });
  other = await db.createUser("khalil@school.edu", { role: "teacher", full_name: "Omar Khalil" });
  pending = await db.createUser("new@school.edu", { role: "teacher", full_name: "New Teacher" });
  student = await db.createUser("maya@school.edu", { role: "student", full_name: "Maya Haddad" });
  outsider = await db.createUser("lea@school.edu", { role: "student", full_name: "Lea S." });
  await q("update public.profiles set status = 'approved' where id = any($1)", [[teacher, other]]);

  biology = await db.commitAs(teacher, async (c) => (await c.query("select * from public.create_class('Biology', 'Period 3')")).rows[0]);
  chemistry = await db.commitAs(other, async (c) => (await c.query("select * from public.create_class('Chemistry')")).rows[0]);
  await db.commitAs(student, (c) => c.query("select * from public.join_class($1)", [biology.join_code.toLowerCase()]));
}, 30_000);

afterAll(async () => {
  await db?.drop();
});

describe("create_class", () => {
  it("gives a 5-character code without look-alike characters", () => {
    expect(biology.join_code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  });

  it("refuses pending teachers and students", async () => {
    expect(await errorOf(db.as(pending, (c) => c.query("select public.create_class('X')")))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(student, (c) => c.query("select public.create_class('X')")))).toMatch(/not_allowed/);
  });

  it("rejects an empty name", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.create_class('   ')")))).toMatch(/check/);
  });

  it("can't be inserted directly", async () => {
    const err = await errorOf(
      db.as(teacher, (c) =>
        c.query("insert into public.classes (teacher_id, name, join_code) values ($1, 'Sneaky', 'AAAAA')", [teacher]),
      ),
    );
    expect(err).toMatch(/permission denied/);
  });
});

describe("classes RLS", () => {
  it("shows a teacher only their own classes", async () => {
    const rows = await db.as(teacher, async (c) => (await c.query("select name from public.classes")).rows);
    expect(rows.map((r) => r.name)).toEqual(["Biology"]);
  });

  it("shows a student the classes they joined", async () => {
    const rows = await db.as(student, async (c) => (await c.query("select name from public.classes")).rows);
    expect(rows.map((r) => r.name)).toEqual(["Biology"]);
    expect(await db.as(outsider, async (c) => (await c.query("select * from public.classes")).rowCount)).toBe(0);
  });

  it("hides classes from signed-out visitors", async () => {
    expect(await errorOf(db.as(null, (c) => c.query("select * from public.classes")))).toMatch(/permission denied/);
  });

  it("lets the owner rename, but not change the code or owner", async () => {
    const n = await db.as(teacher, async (c) => (await c.query("update public.classes set name = 'Bio' where id = $1", [biology.id])).rowCount);
    expect(n).toBe(1);
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.classes set join_code = 'BBBBB' where id = $1", [biology.id])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.classes set teacher_id = $2 where id = $1", [biology.id, other])))).toMatch(/permission denied/);
  });

  it("doesn't let another teacher or a student rename or delete it", async () => {
    for (const who of [other, student]) {
      expect(await db.as(who, async (c) => (await c.query("update public.classes set name = 'X' where id = $1", [biology.id])).rowCount)).toBe(0);
      expect(await db.as(who, async (c) => (await c.query("delete from public.classes where id = $1", [biology.id])).rowCount)).toBe(0);
    }
  });

  it("lets the owner delete a class, removing members and announcements", async () => {
    await db.as(teacher, async (c) => {
      const cls = (await c.query("select * from public.create_class('Temp')")).rows[0];
      await c.query("insert into public.announcements (class_id, body) values ($1, 'hi')", [cls.id]);
      expect((await c.query("delete from public.classes where id = $1", [cls.id])).rowCount).toBe(1);
      expect((await c.query("select * from public.announcements where class_id = $1", [cls.id])).rowCount).toBe(0);
    });
  });
});

describe("join codes", () => {
  it("lets the owner make a new code and the old one stops working", async () => {
    await db.as(teacher, async (c) => {
      const code = (await c.query("select public.regenerate_join_code($1) as code", [biology.id])).rows[0].code;
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
      expect(code).not.toBe(biology.join_code);
    });
  });

  it("refuses a new code for someone else's class", async () => {
    expect(await errorOf(db.as(other, (c) => c.query("select public.regenerate_join_code($1)", [biology.id])))).toMatch(/not_allowed/);
  });

  it("join_class finds a class by code, ignoring case and dashes; joining twice is fine", async () => {
    const rows = await db.as(outsider, async (c) => {
      await c.query("select * from public.join_class($1)", [`${chemistry.join_code.slice(0, 2)}-${chemistry.join_code.slice(2).toLowerCase()}`]);
      await c.query("select * from public.join_class($1)", [chemistry.join_code]);
      return (await c.query("select class_id from public.class_members")).rows;
    });
    expect(rows).toEqual([{ class_id: chemistry.id }]);
  });

  it("join_class finds nothing for unknown codes and refuses non-students", async () => {
    expect(await db.as(outsider, async (c) => (await c.query("select * from public.join_class('ZZZZZ')")).rowCount)).toBe(0);
    expect(await errorOf(db.as(teacher, (c) => c.query("select * from public.join_class($1)", [chemistry.join_code])))).toMatch(/not_a_student/);
  });

  it("members can't be added directly", async () => {
    const err = await errorOf(
      db.as(outsider, (c) => c.query("insert into public.class_members (class_id, student_id) values ($1, $2)", [biology.id, outsider])),
    );
    expect(err).toMatch(/permission denied/);
  });
});

describe("roster", () => {
  it("teachers can't read students' profile rows; the roster gives name and email only", async () => {
    const rows = await db.as(teacher, async (c) => (await c.query("select email from public.profiles order by email")).rows);
    expect(rows.map((r) => r.email)).toEqual(["rahme@school.edu"]);
    const cols = await db.as(teacher, async (c) => Object.keys((await c.query("select * from public.class_roster($1)", [biology.id])).rows[0]));
    expect(cols).toEqual(["student_id", "full_name", "email", "joined_at", "modules_done", "quiz_first_correct", "quiz_first_total"]);
  });

  it("class_roster lists the class's students only for its teacher", async () => {
    const mine = await db.as(teacher, async (c) => (await c.query("select * from public.class_roster($1)", [biology.id])).rows);
    expect(mine.map((r) => r.full_name)).toEqual(["Maya Haddad"]);
    const theirs = await db.as(other, async (c) => (await c.query("select * from public.class_roster($1)", [biology.id])).rows);
    expect(theirs).toEqual([]);
  });

  it("a student sees only their own membership", async () => {
    const rows = await db.as(student, async (c) => (await c.query("select student_id from public.class_members")).rows);
    expect(rows).toEqual([{ student_id: student }]);
  });

  it("the teacher can remove a student; another teacher can't", async () => {
    expect(
      await db.as(other, async (c) => (await c.query("delete from public.class_members where class_id = $1", [biology.id])).rowCount),
    ).toBe(0);
    expect(
      await db.as(teacher, async (c) => (await c.query("delete from public.class_members where student_id = $1", [student])).rowCount),
    ).toBe(1);
  });

  it("a student can leave a class", async () => {
    expect(
      await db.as(student, async (c) => (await c.query("delete from public.class_members where class_id = $1", [biology.id])).rowCount),
    ).toBe(1);
  });
});

describe("announcements", () => {
  it("the teacher posts; members read; outsiders and other teachers don't", async () => {
    await db.commitAs(teacher, (c) => c.query("insert into public.announcements (class_id, body) values ($1, 'Bring your lab notebook.')", [biology.id]));
    const seen = async (who: string) => (await db.as(who, async (c) => (await c.query("select body from public.announcements")).rows)).length;
    expect(await seen(teacher)).toBe(1);
    expect(await seen(student)).toBe(1);
    expect(await seen(outsider)).toBe(0);
    expect(await seen(other)).toBe(0);
  });

  it("stamps the author and refuses posting as someone else", async () => {
    const author = (await q("select author_id from public.announcements limit 1")).rows[0].author_id;
    expect(author).toBe(teacher);
    const err = await errorOf(
      db.as(teacher, (c) => c.query("insert into public.announcements (class_id, body, author_id) values ($1, 'x', $2)", [biology.id, other])),
    );
    expect(err).toMatch(/permission denied/);
  });

  it("refuses posts to someone else's class, from students, and over 500 characters", async () => {
    expect(await errorOf(db.as(other, (c) => c.query("insert into public.announcements (class_id, body) values ($1, 'x')", [biology.id])))).toMatch(/row-level security/);
    expect(await errorOf(db.as(student, (c) => c.query("insert into public.announcements (class_id, body) values ($1, 'x')", [biology.id])))).toMatch(/row-level security/);
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.announcements (class_id, body) values ($1, $2)", [biology.id, "a".repeat(501)])))).toMatch(/check/);
  });

  it("members mark announcements seen; the teacher sees the count", async () => {
    const id = (await q("select id from public.announcements limit 1")).rows[0].id;
    await db.commitAs(student, (c) => c.query("insert into public.announcement_reads (announcement_id) values ($1)", [id]));
    expect(await errorOf(db.as(outsider, (c) => c.query("insert into public.announcement_reads (announcement_id) values ($1)", [id])))).toMatch(/row-level security/);
    const n = await db.as(teacher, async (c) => (await c.query("select count(*)::int as n from public.announcement_reads")).rows[0].n);
    expect(n).toBe(1);
  });

  it("only the class's teacher deletes", async () => {
    expect(await db.as(student, async (c) => (await c.query("delete from public.announcements")).rowCount)).toBe(0);
    expect(await db.as(teacher, async (c) => (await c.query("delete from public.announcements")).rowCount)).toBe(1);
  });
});

describe("courses and progress", () => {
  let course: string;
  let modules: string[];

  beforeAll(async () => {
    // Course content is written by later stages; set it up as the database owner.
    course = (await q("insert into public.courses (teacher_id, title, status) values ($1, 'Photosynthesis', 'assigned') returning id", [teacher])).rows[0].id;
    modules = (
      await q("insert into public.modules (course_id, position, heading) select $1, g, 'M' || g from generate_series(1, 3) g returning id", [course])
    ).rows.map((r) => r.id);
    await q("insert into public.course_assignments (course_id, class_id, due_date) values ($1, $2, current_date - 1)", [course, biology.id]);
    await q("insert into public.class_members (class_id, student_id) values ($1, $2)", [biology.id, outsider]);
    await q("insert into public.module_progress (student_id, module_id, course_id) values ($1, $2, $3)", [outsider, modules[0], course]);
    await q("insert into public.quiz_attempts (student_id, module_id, course_id, chosen_index, is_correct, is_first) values ($1, $2, $3, 1, true, true)", [outsider, modules[0], course]);
  });

  it("the owner and assigned students see the course and modules; others don't", async () => {
    const count = async (who: string, table: string) =>
      db.as(who, async (c) => (await c.query(`select count(*)::int as n from public.${table}`)).rows[0].n);
    expect(await count(teacher, "courses")).toBe(1);
    expect(await count(outsider, "courses")).toBe(1);
    expect(await count(other, "courses")).toBe(0);
    expect(await count(teacher, "modules")).toBe(3);
    expect(await count(outsider, "modules")).toBe(3);
    expect(await count(other, "modules")).toBe(0);
  });

  it("clients can't write courses or modules yet", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.courses (teacher_id, title) values ($1, 'X')", [teacher])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.modules set heading = 'X'")))).toMatch(/permission denied/);
  });

  it("progress and quiz results are visible to the student and the course's teacher only", async () => {
    const n = async (who: string) => db.as(who, async (c) => (await c.query("select count(*)::int as n from public.module_progress")).rows[0].n);
    expect(await n(outsider)).toBe(1);
    expect(await n(teacher)).toBe(1);
    expect(await n(other)).toBe(0);
    expect(await n(student)).toBe(0);
  });

  it("class summaries count students, courses and overdue students", async () => {
    const rows = await db.as(teacher, async (c) => (await c.query("select * from public.teacher_class_summaries()")).rows);
    expect(rows).toHaveLength(1);
    expect([rows[0].student_count, rows[0].course_count, rows[0].overdue_students]).toEqual([2, 1, 2]); // Maya (not started) and Lea (1 of 3), due yesterday
    expect(await db.as(other, async (c) => (await c.query("select * from public.teacher_class_summaries()")).rows.map((r) => r.name))).toEqual(["Chemistry"]);
  });

  it("class course stats and roster report progress", async () => {
    const stats = await db.as(teacher, async (c) => (await c.query("select * from public.class_course_stats($1)", [biology.id])).rows);
    expect(stats[0]).toMatchObject({ title: "Photosynthesis", module_count: 3, students_started: 1, students_complete: 0, students_overdue: 2 });
    const roster = await db.as(teacher, async (c) => (await c.query("select * from public.class_roster($1, $2)", [biology.id, course])).rows);
    expect(roster[0]).toMatchObject({ full_name: "Lea S.", modules_done: 1, quiz_first_correct: 1, quiz_first_total: 1 });
    expect(await db.as(other, async (c) => (await c.query("select * from public.class_course_stats($1)", [biology.id])).rows)).toEqual([]);
  });
});

describe("profile defaults", () => {
  it("lets a user set their new-course defaults", async () => {
    const n = await db.as(teacher, async (c) =>
      (await c.query("update public.profiles set default_course_locale = 'fr', default_course_level = 'advanced' where id = $1", [teacher])).rowCount,
    );
    expect(n).toBe(1);
  });

  it("still can't change role or status", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.profiles set role = 'admin' where id = $1", [teacher])))).toMatch(/permission denied/);
  });
});

describe("rejected and pending teachers", () => {
  let rejected: string;
  let cls: { id: string; join_code: string };

  beforeAll(async () => {
    rejected = await db.createUser("gone@school.edu", { role: "teacher", full_name: "Gone Teacher" });
    await q("update public.profiles set status = 'approved' where id = $1", [rejected]);
    cls = await db.commitAs(rejected, async (c) => (await c.query("select * from public.create_class('History')")).rows[0]);
    await q("insert into public.class_members (class_id, student_id) values ($1, $2)", [cls.id, student]);
    await q("insert into public.announcements (class_id, author_id, body) values ($1, $2, 'hi')", [cls.id, rejected]);
    await q("update public.profiles set status = 'rejected' where id = $1", [rejected]);
  });

  it("a rejected teacher loses access to their classes, students and announcements", async () => {
    await db.as(rejected, async (c) => {
      expect((await c.query("select * from public.classes")).rowCount).toBe(0);
      expect((await c.query("select * from public.class_members")).rowCount).toBe(0);
      expect((await c.query("select * from public.announcements")).rowCount).toBe(0);
      expect((await c.query("select * from public.teacher_class_summaries()")).rowCount).toBe(0);
      expect((await c.query("select * from public.class_roster($1)", [cls.id])).rowCount).toBe(0);
      expect((await c.query("select * from public.class_course_stats($1)", [cls.id])).rowCount).toBe(0);
      expect((await c.query("delete from public.classes where id = $1", [cls.id])).rowCount).toBe(0);
      expect((await c.query("delete from public.class_members where class_id = $1", [cls.id])).rowCount).toBe(0);
      expect((await c.query("delete from public.announcements where class_id = $1", [cls.id])).rowCount).toBe(0);
      expect((await c.query("update public.classes set name = 'X' where id = $1", [cls.id])).rowCount).toBe(0);
    });
    expect(await errorOf(db.as(rejected, (c) => c.query("select public.regenerate_join_code($1)", [cls.id])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(rejected, (c) => c.query("select public.create_class('X')")))).toMatch(/not_allowed/);
  });

  it("students can't join a rejected teacher's class", async () => {
    expect(await db.as(outsider, async (c) => (await c.query("select * from public.join_class($1)", [cls.join_code])).rowCount)).toBe(0);
  });

  it("a pending teacher reaches nothing", async () => {
    await db.as(pending, async (c) => {
      expect((await c.query("select * from public.classes")).rowCount).toBe(0);
      expect((await c.query("select * from public.teacher_class_summaries()")).rowCount).toBe(0);
      expect((await c.query("select * from public.class_roster($1)", [biology.id])).rowCount).toBe(0);
    });
  });
});

describe("join code guessing", () => {
  it("refuses after 10 wrong codes in an hour", async () => {
    const guesser = await db.createUser("guess@school.edu", { role: "student" });
    const err = await errorOf(
      db.as(guesser, async (c) => {
        for (let i = 0; i < 10; i++) await c.query("select * from public.join_class('ZZZZZ')");
        await c.query("select * from public.join_class($1)", [biology.join_code]);
      }),
    );
    expect(err).toMatch(/rate_limited/);
  });

  it("join attempts are invisible to clients", async () => {
    expect(await errorOf(db.as(student, (c) => c.query("select * from public.join_attempts")))).toMatch(/permission denied/);
  });
});

describe("data integrity", () => {
  it("progress must use the module's own course", async () => {
    const [c1, c2] = (
      await q("insert into public.courses (teacher_id, title) values ($1, 'A'), ($1, 'B') returning id", [teacher])
    ).rows.map((r) => r.id);
    const m1 = (await q("insert into public.modules (course_id, position) values ($1, 1) returning id", [c1])).rows[0].id;
    expect(
      await errorOf(q("insert into public.module_progress (student_id, module_id, course_id) values ($1, $2, $3)", [student, m1, c2])),
    ).toMatch(/foreign key/);
  });

  it("a course can only be assigned to its own teacher's class", async () => {
    const theirs = (await q("insert into public.courses (teacher_id, title) values ($1, 'Theirs') returning id", [other])).rows[0].id;
    expect(
      await errorOf(q("insert into public.course_assignments (course_id, class_id) values ($1, $2)", [theirs, biology.id])),
    ).toMatch(/course_and_class_teachers_differ/);
  });

  it("students don't see draft courses assigned to their class", async () => {
    const draft = (await q("insert into public.courses (teacher_id, title, status) values ($1, 'Draft', 'draft') returning id", [teacher])).rows[0].id;
    await q("insert into public.course_assignments (course_id, class_id) values ($1, $2)", [draft, biology.id]);
    const titles = await db.as(student, async (c) => (await c.query("select title from public.courses")).rows.map((r) => r.title));
    expect(titles).not.toContain("Draft");
  });

  it("class names are trimmed on rename", async () => {
    const name = await db.as(teacher, async (c) =>
      (await c.query("update public.classes set name = '  Bio  ' where id = $1 returning name", [biology.id])).rows[0].name,
    );
    expect(name).toBe("Bio");
  });

  it("anon can't call the class functions", async () => {
    for (const sql of [
      "select * from public.teacher_class_summaries()",
      "select * from public.join_class('AAAAA')",
      "select public.create_class('X')",
    ]) {
      expect(await errorOf(db.as(null, (c) => c.query(sql)))).toMatch(/permission denied/);
    }
  });
});
