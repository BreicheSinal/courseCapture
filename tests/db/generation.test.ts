import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, errorOf, type Db } from "./harness";

// Stage 5: courses, generation jobs, AI usage, module edits and assignments.

let db: Db;
let teacher: string;
let other: string; // another approved teacher
let pending: string; // teacher waiting for approval
let maya: string; // student in Biology
let biology: string;
let chemistry: string; // the other teacher's class
let course: string;
let modules: string[];

const q = (sql: string, params: unknown[] = []) => db.client.query(sql, params);
const svg = '<svg viewBox="0 0 400 220"><rect width="10" height="10"/></svg>';

beforeAll(async () => {
  db = await createTestDb();
  teacher = await db.createUser("rahme@school.edu", { role: "teacher", full_name: "Nadia Rahme" });
  other = await db.createUser("saad@school.edu", { role: "teacher", full_name: "Karim Saad" });
  pending = await db.createUser("new@school.edu", { role: "teacher", full_name: "New Teacher" });
  maya = await db.createUser("maya@school.edu", { role: "student", full_name: "Maya Haddad" });
  await q("update public.profiles set status = 'approved' where id = any($1)", [[teacher, other]]);
  biology = (await db.commitAs(teacher, (c) => c.query("select * from public.create_class('Biology', '')"))).rows[0].id;
  chemistry = (await db.commitAs(other, (c) => c.query("select * from public.create_class('Chemistry', '')"))).rows[0].id;
  await q("insert into public.class_members (class_id, student_id) values ($1, $2)", [biology, maya]);

  // A generated course, written the way the job writes it (service role).
  course = (await q("insert into public.courses (teacher_id, title) values ($1, 'Photosynthesis') returning id", [teacher])).rows[0].id;
  modules = (
    await q(
      `insert into public.modules (course_id, position, heading, body, key_points, flashcards, quiz, review_note)
       select $1, g, 'Module ' || g, 'Body ' || g, array['Point'], '[{"q":"Q","a":"A"}]'::jsonb,
              '{"question":"Which gas?","options":["Oxygen","Carbon dioxide","Water","Nitrogen"]}'::jsonb,
              case when g = 2 then 'Diagram labels may be wrong' end
       from generate_series(1, 3) g order by g returning id`,
      [course],
    )
  ).rows.map((r) => r.id);
  await q("insert into public.quiz_answers (module_id, answer_index, explanation) select unnest($1::uuid[]), 1, ''", [modules]);
}, 30_000);

afterAll(async () => {
  await db?.drop();
});

describe("courses", () => {
  it("an approved teacher creates a draft of their own", async () => {
    const row = await db.as(teacher, async (c) =>
      (await c.query("insert into public.courses (teacher_id, title, content_locale, level) values ($1, '  New\ncourse ', 'fr', 'beginner') returning *", [teacher])).rows[0],
    );
    expect(row).toMatchObject({ title: "New course", status: "draft", content_locale: "fr", level: "beginner" });
  });

  it("nobody else can create one for them, and a pending teacher or student can't create any", async () => {
    expect(await errorOf(db.as(other, (c) => c.query("insert into public.courses (teacher_id, title) values ($1, 'X')", [teacher])))).toMatch(/row-level security/);
    expect(await errorOf(db.as(pending, (c) => c.query("insert into public.courses (teacher_id, title) values ($1, 'X')", [pending])))).toMatch(/row-level security/);
    expect(await errorOf(db.as(maya, (c) => c.query("insert into public.courses (teacher_id, title) values ($1, 'X')", [maya])))).toMatch(/row-level security/);
  });

  it("status and teacher can't be set by clients", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.courses (teacher_id, title, status) values ($1, 'X', 'assigned')", [teacher])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.courses set status = 'assigned' where id = $1", [course])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.courses set teacher_id = $2 where id = $1", [course, other])))).toMatch(/permission denied/);
  });

  it("the owner renames and deletes; others change nothing", async () => {
    expect(await db.as(teacher, async (c) => (await c.query("update public.courses set title = 'Light' where id = $1", [course])).rowCount)).toBe(1);
    expect(await db.as(other, async (c) => (await c.query("update public.courses set title = 'Hacked' where id = $1", [course])).rowCount)).toBe(0);
    expect(await db.as(maya, async (c) => (await c.query("delete from public.courses where id = $1", [course])).rowCount)).toBe(0);
    expect(await db.as(teacher, async (c) => (await c.query("delete from public.courses where id = $1", [course])).rowCount)).toBe(1);
  });

  it("titles must not be blank", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.courses set title = '   ' where id = $1", [course])))).toMatch(/check constraint/);
  });
});

describe("generation jobs", () => {
  let job: string;
  beforeAll(async () => {
    job = (await q("insert into public.generation_jobs (course_id, teacher_id, source_kind, step) values ($1, $2, 'pdf', 'writing') returning id", [course, teacher])).rows[0].id;
  });
  afterAll(async () => {
    await q("delete from public.generation_jobs where id = $1", [job]);
  });

  it("the course's teacher reads the job; other teachers and students don't", async () => {
    expect(await db.as(teacher, async (c) => (await c.query("select step from public.generation_jobs")).rows)).toEqual([{ step: "writing" }]);
    expect(await db.as(other, async (c) => (await c.query("select * from public.generation_jobs")).rowCount)).toBe(0);
    expect(await db.as(maya, async (c) => (await c.query("select * from public.generation_jobs")).rowCount)).toBe(0);
  });

  it("clients can't write jobs", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.generation_jobs set step = 'done'")))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.generation_jobs (course_id, teacher_id, source_kind) values ($1, $2, 'pdf')", [course, teacher])))).toMatch(/permission denied/);
  });

  it("only one job runs per course", async () => {
    expect(await errorOf(q("insert into public.generation_jobs (course_id, teacher_id, source_kind) values ($1, $2, 'text')", [course, teacher]))).toMatch(/generation_jobs_one_active_idx/);
  });

  it("a course can't be assigned while it's generating", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.assign_course($1, $2, null)", [course, biology])))).toMatch(/still_generating/);
  });
});

describe("AI usage limits", () => {
  it("claims count per person and kind, and stop at the limit", async () => {
    const used = await db.asService(async (c) => {
      for (let i = 0; i < 2; i++) await c.query("select public.claim_ai_use($1, 'generate', 2, 'anthropic', 'm')", [teacher]);
      const err = await c.query("savepoint s").then(() => errorOf(c.query("select public.claim_ai_use($1, 'generate', 2, 'anthropic', 'm')", [teacher])));
      await c.query("rollback to savepoint s");
      // Another kind and another person are counted separately.
      await c.query("select public.claim_ai_use($1, 'redraw', 2, 'anthropic', 'm')", [teacher]);
      await c.query("select public.claim_ai_use($1, 'generate', 2, 'anthropic', 'm')", [other]);
      return err;
    });
    expect(used).toMatch(/daily_limit/);
  });

  it("tokens add up on the claimed use", async () => {
    const row = await db.asService(async (c) => {
      const id = (await c.query("select public.claim_ai_use($1, 'generate', null, 'anthropic', 'm') as id", [teacher])).rows[0].id;
      await c.query("select public.add_ai_tokens($1, 100, 20)", [id]);
      await c.query("select public.add_ai_tokens($1, 50, -5)", [id]);
      return (await c.query("select input_tokens, output_tokens from public.ai_usage where id = $1", [id])).rows[0];
    });
    expect(row).toEqual({ input_tokens: 150, output_tokens: 20 });
  });

  it("people read only their own usage and can't claim or write it", async () => {
    await q("insert into public.ai_usage (user_id, kind) values ($1, 'generate'), ($2, 'tutor')", [teacher, maya]);
    expect(await db.as(teacher, async (c) => (await c.query("select kind from public.ai_usage")).rows)).toEqual([{ kind: "generate" }]);
    expect(await db.as(teacher, async (c) => (await c.query("select * from public.my_ai_usage_today()")).rows)).toEqual([{ kind: "generate", used: 1 }]);
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.claim_ai_use($1, 'generate', 100, '', '')", [teacher])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.ai_usage (user_id, kind) values ($1, 'generate')", [teacher])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(null, (c) => c.query("select * from public.my_ai_usage_today()")))).toMatch(/permission denied/);
  });
});

describe("module edits", () => {
  const save = (uid: string, mod: string, over: Record<string, unknown> = {}) => {
    const v = {
      heading: "Light reactions",
      body: "Light splits water.",
      points: ["One", "  ", "Two"],
      cards: [{ q: "Q1", a: "A1" }, { q: " ", a: "dropped" }],
      quiz: { question: "Which gas is released?", options: ["Oxygen", "Nitrogen", "Helium"] },
      answer: 0,
      explanation: "Water is split.",
      caption: "",
      alt: "",
      ...over,
    };
    return db.as(uid, (c) =>
      c.query("select public.save_module($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", [
        mod, v.heading, v.body, v.points, JSON.stringify(v.cards), v.quiz === null ? null : JSON.stringify(v.quiz), v.answer, v.explanation, v.caption, v.alt,
      ]).then(async () => ({
        module: (await c.query("select heading, key_points, flashcards, quiz from public.modules where id = $1", [mod])).rows[0],
        answer: (await c.query("select answer_index, explanation from public.quiz_answers where module_id = $1", [mod])).rows[0],
      })),
    );
  };

  it("the owner saves text, key points, flashcards, quiz and answer together", async () => {
    const r = await save(teacher, modules[0]);
    expect(r.module).toEqual({
      heading: "Light reactions",
      key_points: ["One", "Two"],
      flashcards: [{ q: "Q1", a: "A1" }],
      quiz: { question: "Which gas is released?", options: ["Oxygen", "Nitrogen", "Helium"] },
    });
    expect(r.answer).toEqual({ answer_index: 0, explanation: "Water is split." });
  });

  it("removing the quiz removes its answer", async () => {
    const r = await save(teacher, modules[0], { quiz: null, answer: null });
    expect(r.module.quiz).toBeNull();
    expect(r.answer).toBeUndefined();
  });

  it("rejects bad input", async () => {
    expect(await errorOf(save(teacher, modules[0], { heading: " " }))).toMatch(/invalid_heading/);
    expect(await errorOf(save(teacher, modules[0], { answer: 3 }))).toMatch(/invalid_answer/);
    expect(await errorOf(save(teacher, modules[0], { quiz: { question: "Q", options: ["Only one"] } }))).toMatch(/invalid_quiz/);
    expect(await errorOf(save(teacher, modules[0], { quiz: { question: "Q", options: ["A", "B"], answer_index: 0 } }))).toBeNull(); // extra keys are dropped
    expect(await errorOf(save(teacher, modules[0], { cards: [{ q: 1, a: "A" }] }))).toMatch(/invalid_flashcards/);
    expect(await errorOf(save(teacher, modules[0], { points: Array(9).fill("p") }))).toMatch(/invalid_key_points/);
  });

  it("a module with a diagram needs alt text", async () => {
    await q("update public.modules set visual_svg = $2, visual_alt = 'A box' where id = $1", [modules[1], svg]);
    expect(await errorOf(save(teacher, modules[1], { alt: " " }))).toMatch(/alt_required/);
    expect(await errorOf(save(teacher, modules[1], { alt: "A box" }))).toBeNull();
  });

  it("other teachers and students can't edit", async () => {
    expect(await errorOf(save(other, modules[0]))).toMatch(/not_allowed/);
    expect(await errorOf(save(maya, modules[0]))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(maya, (c) => c.query("select public.set_module_checked($1, true)", [modules[0]])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(other, (c) => c.query("select public.delete_module($1)", [modules[0]])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(null, (c) => c.query("select public.move_module($1, 1)", [modules[0]])))).toMatch(/permission denied/);
  });

  it("clients can't write modules, diagrams or answers directly", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.modules set visual_svg = '<svg onload=x/>' where id = $1", [modules[0]])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.modules (course_id, position) values ($1, 9)", [course])))).toMatch(/permission denied/);
    expect(await errorOf(db.as(teacher, (c) => c.query("update public.quiz_answers set answer_index = 2")))).toMatch(/permission denied/);
  });

  it("marking checked clears the review note; undo clears the date", async () => {
    const after = await db.as(teacher, async (c) => {
      await c.query("select public.set_module_checked($1, true)", [modules[1]]);
      const on = (await c.query("select review_note, checked_at is not null as checked from public.modules where id = $1", [modules[1]])).rows[0];
      await c.query("select public.set_module_checked($1, false)", [modules[1]]);
      const off = (await c.query("select checked_at from public.modules where id = $1", [modules[1]])).rows[0];
      return { on, off };
    });
    expect(after.on).toEqual({ review_note: null, checked: true });
    expect(after.off.checked_at).toBeNull();
  });

  it("removing a diagram clears its picture, caption and alt text", async () => {
    const row = await db.as(teacher, async (c) => {
      await c.query("select public.clear_module_visual($1)", [modules[1]]);
      return (await c.query("select visual_svg, visual_caption, visual_alt from public.modules where id = $1", [modules[1]])).rows[0];
    });
    expect(row).toEqual({ visual_svg: null, visual_caption: null, visual_alt: null });
  });

  it("moving swaps neighbours and stops at the ends", async () => {
    const order = await db.as(teacher, async (c) => {
      const first = (await c.query("select public.move_module($1, 1) as p", [modules[0]])).rows[0].p;
      const edge = (await c.query("select public.move_module($1, -1) as p", [modules[1]])).rows[0].p; // module 2 is now first
      const rows = (await c.query("select id from public.modules where course_id = $1 order by position", [course])).rows.map((r) => r.id);
      return { first, edge, rows };
    });
    expect(order.first).toBe(2);
    expect(order.edge).toBe(1);
    expect(order.rows).toEqual([modules[1], modules[0], modules[2]]);
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.move_module($1, 2)", [modules[0]])))).toMatch(/invalid_offset/);
  });

  it("deleting closes the gap and keeps at least one module", async () => {
    const rows = await db.as(teacher, async (c) => {
      await c.query("select public.delete_module($1)", [modules[0]]);
      const left = (await c.query("select id, position from public.modules where course_id = $1 order by position", [course])).rows;
      await c.query("select public.delete_module($1)", [modules[1]]);
      const err = await c.query("savepoint s").then(() => errorOf(c.query("select public.delete_module($1)", [modules[2]])));
      await c.query("rollback to savepoint s");
      return { left, err };
    });
    expect(rows.left).toEqual([
      { id: modules[1], position: 1 },
      { id: modules[2], position: 2 },
    ]);
    expect(rows.err).toMatch(/last_module/);
  });
});

describe("assignments", () => {
  it("assigning makes the course visible to the class, with that class's due date", async () => {
    const seen = await db.as(teacher, async (c) => {
      await c.query("select public.assign_course($1, $2, current_date + 7)", [course, biology]);
      const status = (await c.query("select status, assigned_at is not null as at from public.courses where id = $1", [course])).rows[0];
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [maya]);
      const student = (await c.query("select title from public.courses")).rows;
      const due = (await c.query("select due_date - current_date as days from public.course_assignments")).rows;
      return { status, student, due };
    });
    expect(seen.status).toEqual({ status: "assigned", at: true });
    expect(seen.student).toEqual([{ title: "Photosynthesis" }]);
    expect(seen.due).toEqual([{ days: 7 }]);
  });

  it("assigning again changes the due date; a past date is refused", async () => {
    const days = await db.as(teacher, async (c) => {
      await c.query("select public.assign_course($1, $2, current_date + 7)", [course, biology]);
      await c.query("select public.assign_course($1, $2, null)", [course, biology]);
      return (await c.query("select due_date from public.course_assignments where course_id = $1", [course])).rows;
    });
    expect(days).toEqual([{ due_date: null }]);
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.assign_course($1, $2, current_date - 10)", [course, biology])))).toMatch(/invalid_due_date/);
  });

  it("an unchanged past due date can be saved again", async () => {
    const err = await db.as(teacher, async (c) => {
      await c.query("select public.assign_course($1, $2, null)", [course, biology]);
      await c.query("reset role");
      await c.query("update public.course_assignments set due_date = current_date - 10 where course_id = $1", [course]);
      await c.query("set local role authenticated");
      return errorOf(c.query("select public.assign_course($1, $2, current_date - 10)", [course, biology]));
    });
    expect(err).toBeNull();
  });

  it("only the owner, only to their own classes, only with modules", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.assign_course($1, $2, null)", [course, chemistry])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(other, (c) => c.query("select public.assign_course($1, $2, null)", [course, chemistry])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(maya, (c) => c.query("select public.assign_course($1, $2, null)", [course, biology])))).toMatch(/not_allowed/);
    const empty = (await q("insert into public.courses (teacher_id, title) values ($1, 'Empty') returning id", [teacher])).rows[0].id;
    expect(await errorOf(db.as(teacher, (c) => c.query("select public.assign_course($1, $2, null)", [empty, biology])))).toMatch(/no_modules/);
  });

  it("unassigning the last class puts the course back to draft and hides it from students", async () => {
    const after = await db.as(teacher, async (c) => {
      await c.query("select public.assign_course($1, $2, null)", [course, biology]);
      await c.query("select public.unassign_course($1, $2)", [course, biology]);
      const status = (await c.query("select status from public.courses where id = $1", [course])).rows[0].status;
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [maya]);
      return { status, student: (await c.query("select * from public.courses")).rowCount };
    });
    expect(after).toEqual({ status: "draft", student: 0 });
  });

  it("clients can't write assignments directly", async () => {
    expect(await errorOf(db.as(teacher, (c) => c.query("insert into public.course_assignments (course_id, class_id) values ($1, $2)", [course, biology])))).toMatch(/permission denied/);
  });
});
