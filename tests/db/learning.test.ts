import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, errorOf, type Db } from "./harness";

let db: Db;
let teacher: string;
let maya: string; // in Biology
let omar: string; // in no class
let biology: string;
let course: string;
let draft: string;
let modules: string[];

const q = (sql: string, params: unknown[] = []) => db.client.query(sql, params);

beforeAll(async () => {
  db = await createTestDb();
  teacher = await db.createUser("rahme@school.edu", { role: "teacher", full_name: "Nadia Rahme" });
  maya = await db.createUser("maya@school.edu", { role: "student", full_name: "Maya Haddad" });
  omar = await db.createUser("omar@school.edu", { role: "student", full_name: "Omar Khalil" });
  await q("update public.profiles set status = 'approved' where id = $1", [teacher]);
  biology = (await db.commitAs(teacher, (c) => c.query("select * from public.create_class('Biology', 'Period 3')"))).rows[0].id;
  await q("insert into public.class_members (class_id, student_id) values ($1, $2)", [biology, maya]);

  // Course content is written by stage 5; set it up as the database owner.
  course = (await q("insert into public.courses (teacher_id, title, status) values ($1, 'Photosynthesis', 'assigned') returning id", [teacher])).rows[0].id;
  draft = (await q("insert into public.courses (teacher_id, title, status) values ($1, 'Draft', 'draft') returning id", [teacher])).rows[0].id;
  modules = (
    await q(
      `insert into public.modules (course_id, position, heading, quiz)
       select $1, g, 'Module ' || g, case when g < 3 then '{"question":"Which gas?","options":["Oxygen","Carbon dioxide","Water"]}'::jsonb end
       from generate_series(1, 3) g returning id`,
      [course],
    )
  ).rows.map((r) => r.id);
  await q("insert into public.quiz_answers (module_id, answer_index, explanation) values ($1, 1, 'Plants take in CO2.'), ($2, 0, 'They give off O2.')", [modules[0], modules[1]]);
  await q("insert into public.course_assignments (course_id, class_id, due_date) values ($1, $2, current_date + 3), ($3, $2, null)", [course, biology, draft]);
  await q("insert into public.modules (course_id, position, heading) values ($1, 1, 'Secret draft')", [draft]);
}, 30_000);

afterAll(async () => {
  await db?.drop();
});

describe("quiz answers stay on the server", () => {
  it("students can't read quiz_answers; the course's teacher can", async () => {
    expect(await db.as(maya, async (c) => (await c.query("select * from public.quiz_answers")).rowCount)).toBe(0);
    expect(await db.as(teacher, async (c) => (await c.query("select * from public.quiz_answers")).rowCount)).toBe(2);
  });

  it("modules show the question and options, not the answer", async () => {
    const quiz = await db.as(maya, async (c) => (await c.query("select quiz from public.modules where id = $1", [modules[0]])).rows[0].quiz);
    expect(quiz).toEqual({ question: "Which gas?", options: ["Oxygen", "Carbon dioxide", "Water"] });
  });

  it("anon gets nothing", async () => {
    expect(await errorOf(db.as(null, (c) => c.query("select * from public.quiz_answers")))).toMatch(/permission denied/);
    expect(await errorOf(db.as(null, (c) => c.query("select * from public.answer_quiz($1, 0)", [modules[0]])))).toMatch(/permission denied/);
  });
});

describe("answer_quiz", () => {
  it("records the first answer as the one that counts and reveals the answer", async () => {
    const first = await db.commitAs(maya, async (c) => (await c.query("select * from public.answer_quiz($1, 0)", [modules[0]])).rows[0]);
    expect(first).toEqual({ is_correct: false, answer_index: 1, explanation: "Plants take in CO2.", first_try: true });
    const again = await db.commitAs(maya, async (c) => (await c.query("select * from public.answer_quiz($1, 1)", [modules[0]])).rows[0]);
    expect(again).toMatchObject({ is_correct: true, first_try: false });
    const firsts = (await q("select count(*)::int as n from public.quiz_attempts where student_id = $1 and is_first", [maya])).rows[0].n;
    expect(firsts).toBe(1);
  });

  it("my_quiz_result returns the first answer only", async () => {
    const r = await db.as(maya, async (c) => (await c.query("select * from public.my_quiz_result($1)", [modules[0]])).rows);
    expect(r).toEqual([{ chosen_index: 0, is_correct: false, answer_index: 1, explanation: "Plants take in CO2." }]);
    expect(await db.as(omar, async (c) => (await c.query("select * from public.my_quiz_result($1)", [modules[0]])).rowCount)).toBe(0);
  });

  it("refuses students outside the class, teachers, out-of-range choices and modules without a quiz", async () => {
    expect(await errorOf(db.as(omar, (c) => c.query("select * from public.answer_quiz($1, 0)", [modules[0]])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(teacher, (c) => c.query("select * from public.answer_quiz($1, 0)", [modules[0]])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(maya, (c) => c.query("select * from public.answer_quiz($1, 3)", [modules[0]])))).toMatch(/invalid_choice/);
    expect(await errorOf(db.as(maya, (c) => c.query("select * from public.answer_quiz($1, -1)", [modules[0]])))).toMatch(/invalid_choice/);
    expect(await errorOf(db.as(maya, (c) => c.query("select * from public.answer_quiz($1, 0)", [modules[2]])))).toMatch(/no_quiz/);
  });

  it("students can't write attempts or progress directly", async () => {
    expect(
      await errorOf(
        db.as(maya, (c) =>
          c.query("insert into public.quiz_attempts (student_id, module_id, course_id, chosen_index, is_correct, is_first) values ($1, $2, $3, 1, true, true)", [maya, modules[1], course]),
        ),
      ),
    ).toMatch(/permission denied/);
    expect(
      await errorOf(db.as(maya, (c) => c.query("insert into public.module_progress (student_id, module_id, course_id) values ($1, $2, $3)", [maya, modules[1], course]))),
    ).toMatch(/permission denied/);
  });
});

describe("complete_module", () => {
  it("records progress once and returns done / total", async () => {
    const a = await db.commitAs(maya, async (c) => (await c.query("select * from public.complete_module($1)", [modules[0]])).rows[0]);
    const b = await db.commitAs(maya, async (c) => (await c.query("select * from public.complete_module($1)", [modules[0]])).rows[0]);
    expect(a).toEqual({ course_id: course, done: 1, total: 3 });
    expect(b).toEqual({ course_id: course, done: 1, total: 3 });
  });

  it("refuses students who can't see the course", async () => {
    expect(await errorOf(db.as(omar, (c) => c.query("select * from public.complete_module($1)", [modules[0]])))).toMatch(/not_allowed/);
  });

  it("a removed student can no longer record progress", async () => {
    const lea = await db.createUser("lea@school.edu", { role: "student" });
    await q("insert into public.class_members (class_id, student_id) values ($1, $2)", [biology, lea]);
    await q("delete from public.class_members where student_id = $1", [lea]);
    expect(await errorOf(db.as(lea, (c) => c.query("select * from public.complete_module($1)", [modules[0]])))).toMatch(/not_allowed/);
  });
});

describe("student reads", () => {
  it("student_courses lists assigned courses with the student's progress, not drafts", async () => {
    const rows = await db.as(maya, async (c) => (await c.query("select * from public.student_courses()")).rows);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Photosynthesis", class_name: "Biology", module_count: 3, modules_done: 1, quiz_correct: 0, quiz_answered: 1 });
    expect(await db.as(omar, async (c) => (await c.query("select * from public.student_courses()")).rowCount)).toBe(0);
  });

  it("drafts and their modules stay hidden from students", async () => {
    expect(await db.as(maya, async (c) => (await c.query("select id from public.modules where course_id = $1", [draft])).rowCount)).toBe(0);
    expect(await db.as(maya, async (c) => (await c.query("select * from public.student_course_modules($1)", [draft])).rowCount)).toBe(0);
  });

  it("student_course_modules shows done and first-try results", async () => {
    const rows = await db.as(maya, async (c) => (await c.query("select position, done, quiz_correct, has_quiz from public.student_course_modules($1)", [course])).rows);
    expect(rows).toEqual([
      { position: 1, done: true, quiz_correct: false, has_quiz: true },
      { position: 2, done: false, quiz_correct: null, has_quiz: true },
      { position: 3, done: false, quiz_correct: null, has_quiz: false },
    ]);
    expect(await db.as(omar, async (c) => (await c.query("select * from public.student_course_modules($1)", [course])).rowCount)).toBe(0);
  });

  it("student_classes gives the teacher's name only", async () => {
    const rows = await db.as(maya, async (c) => (await c.query("select * from public.student_classes()")).rows);
    expect(rows.map((r) => [r.name, r.teacher_name])).toEqual([["Biology", "Nadia Rahme"]]);
    expect(Object.keys(rows[0])).toEqual(["class_id", "name", "section", "teacher_name", "joined_at"]);
    // Still can't read the teacher's profile row directly.
    expect(await db.as(maya, async (c) => (await c.query("select * from public.profiles where id = $1", [teacher])).rowCount)).toBe(0);
  });

  it("student_announcements shows the student's classes only, with seen state", async () => {
    await q("insert into public.announcements (class_id, author_id, body) values ($1, $2, 'Bring your notebook.')", [biology, teacher]);
    const before = await db.as(maya, async (c) => (await c.query("select * from public.student_announcements()")).rows);
    expect(before.map((r) => [r.body, r.teacher_name, r.seen])).toEqual([["Bring your notebook.", "Nadia Rahme", false]]);
    await db.commitAs(maya, (c) => c.query("insert into public.announcement_reads (announcement_id) values ($1)", [before[0].id]));
    const after = await db.as(maya, async (c) => (await c.query("select seen from public.student_announcements()")).rows);
    expect(after[0].seen).toBe(true);
    expect(await db.as(omar, async (c) => (await c.query("select * from public.student_announcements()")).rowCount)).toBe(0);
  });

  it("the teacher sees the student's progress and first answers in the roster", async () => {
    const roster = await db.as(teacher, async (c) => (await c.query("select * from public.class_roster($1, $2)", [biology, course])).rows);
    expect(roster.find((r) => r.full_name === "Maya Haddad")).toMatchObject({ modules_done: 1, quiz_first_correct: 0, quiz_first_total: 1 });
  });
});

describe("stage 4 review fixes", () => {
  it("my_quiz_result is empty before the first answer", async () => {
    expect(await db.as(maya, async (c) => (await c.query("select * from public.my_quiz_result($1)", [modules[1]])).rowCount)).toBe(0);
  });

  it("complete_module refuses a module whose quick check hasn't been answered", async () => {
    expect(await errorOf(db.as(maya, (c) => c.query("select * from public.complete_module($1)", [modules[1]])))).toMatch(/quiz_first/);
    // A module without a quiz can be completed straight away.
    const r = await db.as(maya, async (c) => (await c.query("select * from public.complete_module($1)", [modules[2]])).rows[0]);
    expect(r).toMatchObject({ course_id: course, total: 3 });
  });

  it("the quiz may only hold a question and 2 to 10 options", async () => {
    const bad = [
      '{"question":"Q","options":["A","B"],"answer":1}',
      '{"question":"Q","options":["A"]}',
      '{"question":1,"options":["A","B"]}',
      '{"question":"Q","options":"A,B"}',
    ];
    for (const quiz of bad) {
      expect(await errorOf(q("insert into public.modules (course_id, position, heading, quiz) values ($1, 99, 'Bad', $2::jsonb)", [course, quiz]))).toMatch(
        /modules_quiz_shape/,
      );
    }
  });

  it("students don't see assignments of draft courses", async () => {
    expect(await db.as(maya, async (c) => (await c.query("select course_id from public.course_assignments")).rows.map((r) => r.course_id))).toEqual([course]);
    expect(await db.as(teacher, async (c) => (await c.query("select * from public.course_assignments")).rowCount)).toBe(2);
  });

  it("answer and complete are refused on draft courses", async () => {
    const dm = (await q("select id from public.modules where course_id = $1", [draft])).rows[0].id;
    await q(`update public.modules set quiz = '{"question":"Q","options":["A","B"]}' where id = $1`, [dm]);
    await q("insert into public.quiz_answers (module_id, answer_index) values ($1, 0)", [dm]);
    expect(await errorOf(db.as(maya, (c) => c.query("select * from public.answer_quiz($1, 0)", [dm])))).toMatch(/not_allowed/);
    expect(await errorOf(db.as(maya, (c) => c.query("select * from public.complete_module($1)", [dm])))).toMatch(/not_allowed/);
  });

  it("students of a teacher who is no longer approved lose access", async () => {
    await q("update public.profiles set status = 'rejected' where id = $1", [teacher]);
    try {
      expect(await db.as(maya, async (c) => (await c.query("select * from public.student_courses()")).rowCount)).toBe(0);
      expect(await errorOf(db.as(maya, (c) => c.query("select * from public.answer_quiz($1, 1)", [modules[1]])))).toMatch(/not_allowed/);
    } finally {
      await q("update public.profiles set status = 'approved' where id = $1", [teacher]);
    }
  });

  it("mark_announcements_seen only marks announcements in the student's classes", async () => {
    const other = (await db.commitAs(teacher, (c) => c.query("select * from public.create_class('Chemistry', null)"))).rows[0].id;
    const [mine, theirs] = (
      await q("insert into public.announcements (class_id, author_id, body) values ($1, $3, 'Lab on Friday.'), ($2, $3, 'Other class.') returning id", [
        biology,
        other,
        teacher,
      ])
    ).rows.map((r) => r.id);
    await db.commitAs(maya, (c) => c.query("select public.mark_announcements_seen($1::uuid[])", [[mine, theirs]]));
    const reads = (await q("select announcement_id from public.announcement_reads where student_id = $1", [maya])).rows.map((r) => r.announcement_id);
    expect(reads).toContain(mine);
    expect(reads).not.toContain(theirs);
    // Calling it again is harmless.
    await db.commitAs(maya, (c) => c.query("select public.mark_announcements_seen($1::uuid[])", [[mine]]));
  });

  it("anon can't call any of the new functions; studies_course is internal", async () => {
    const calls = [
      ["my_quiz_result($1)", [modules[0]]],
      ["complete_module($1)", [modules[0]]],
      ["student_classes()", []],
      ["student_courses()", []],
      ["student_course_modules($1)", [course]],
      ["student_announcements(null, 20)", []],
      ["mark_announcements_seen($1::uuid[])", [[modules[0]]]],
    ] as const;
    for (const [fn, params] of calls) {
      expect(await errorOf(db.as(null, (c) => c.query(`select * from public.${fn}`, [...params])))).toMatch(/permission denied/);
    }
    expect(await errorOf(db.as(maya, (c) => c.query("select public.studies_course($1)", [course])))).toMatch(/permission denied/);
  });
});
