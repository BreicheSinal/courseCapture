import { PDFDocument, StandardFonts } from "pdf-lib";
import { expect, test } from "@playwright/test";
import { asUser, closeDb, createClass, createUser, expectAccessible, signIn, sql } from "./helpers";

/**
 * Stage 5 · course generation (issues #29–#35), against the Supabase stand-in
 * and the fake AI provider. Each test makes its own teacher so they don't share state.
 */
const SOURCE =
  "Photosynthesis\n\nPlants turn light into chemical energy. Chlorophyll in the chloroplasts absorbs red and blue light.\n\n" +
  "The light-dependent reactions split water and release oxygen. The Calvin cycle then fixes carbon dioxide into sugar.";

/** Ticks a design-system check or radio the way people do: by clicking its label (the input itself is visually hidden). */
async function tick(input: import("@playwright/test").Locator) {
  await input.locator("xpath=ancestor::label[1]").click();
  await expect(input).toBeChecked();
}

let n = 0;
async function teacher(name = "Nadia Rahme", locale = "en") {
  n += 1;
  const email = `t${Date.now()}${n}@school.edu`;
  const id = await createUser(email, "teacher", name, { uiLocale: locale });
  return { id, email };
}

async function pdf(pages: string[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pages) {
    const page = doc.addPage([600, 800]);
    text.split("\n").forEach((line, i) => line && page.drawText(line, { x: 40, y: 740 - i * 18, size: 12, font }));
  }
  return Buffer.from(await doc.save());
}

/** Pastes the source on T1, generates, and waits for T3. Returns the course id. */
async function generateFromPaste(page: import("@playwright/test").Page, text = SOURCE, locale = "en", courseLocale?: string) {
  await page.goto(`/${locale}/teacher/courses/new`);
  await page.getByRole("button", { name: /paste text instead|لصق نص/i }).click();
  await page.locator("textarea[name=text]").fill(text);
  if (courseLocale) await page.locator("select[name=content_locale]").selectOption(courseLocale);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/review/, { timeout: 60_000 });
  return /courses\/([0-9a-f-]{36})\//.exec(page.url())![1];
}

test.afterAll(closeDb);

test("paste text → generating → review with modules, flashcards, quiz and diagrams", async ({ page }) => {
  const t = await teacher();
  await signIn(page, t);
  await page.goto("/en/teacher/courses/new");
  await expect(page.getByRole("heading", { name: "New course", level: 1 })).toBeVisible();
  await expect(page.getByText("1 · Source")).toBeVisible();
  await expectAccessible(page);

  const courseId = await generateFromPaste(page);
  await expect(page.getByText("Your course is ready to review.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Photosynthesis Plants turn");
  const rows = page.getByRole("region", { name: "Modules" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("3 key points · 2 cards · 1 question · 1 diagram");
  await expect(page.getByText("1 module needs a check.")).toBeVisible();
  await expectAccessible(page);

  const [job] = await sql<{ step: string; source_path: string | null; fallback_chunks: number }>(
    "select step, source_path, fallback_chunks from public.generation_jobs where course_id = $1",
    [courseId],
  );
  expect(job).toEqual({ step: "done", source_path: null, fallback_chunks: 0 });
  const answers = await sql("select a.answer_index from public.quiz_answers a join public.modules m on m.id = a.module_id where m.course_id = $1", [courseId]);
  expect(answers).toHaveLength(3);
  const [{ svg }] = await sql<{ svg: string }>("select visual_svg as svg from public.modules where course_id = $1 and position = 1", [courseId]);
  expect(svg).toContain('fill="var(--accent)"');
  const [usage] = await sql<{ kind: string; input_tokens: number }>("select kind, input_tokens from public.ai_usage where user_id = $1", [t.id]);
  expect(usage.kind).toBe("generate");
  expect(usage.input_tokens).toBeGreaterThan(0);
});

test("upload a PDF (#29): the file is read on the server and the source is kept private", async ({ page }) => {
  const t = await teacher();
  await signIn(page, t);
  await page.goto("/en/teacher/courses/new");
  await page.locator("input[type=file]").setInputFiles({
    name: "photosynthesis.pdf",
    mimeType: "application/pdf",
    buffer: await pdf([SOURCE.split("\n\n").slice(0, 2).join("\n"), SOURCE.split("\n\n")[2]]),
  });
  await expect(page.getByText(/Uploaded · /)).toBeVisible();
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/review/, { timeout: 60_000 });
  const courseId = /courses\/([0-9a-f-]{36})\//.exec(page.url())![1];
  await expect(page.getByRole("region", { name: "Modules" }).getByRole("listitem").first()).toBeVisible();

  const [job] = await sql<{ step: string; source_path: string | null; source_kind: string }>(
    "select step, source_path, source_kind from public.generation_jobs where course_id = $1",
    [courseId],
  );
  // Read, then deleted from the private bucket once the course is written.
  expect(job).toEqual({ step: "done", source_kind: "pdf", source_path: null });

  // Another teacher can't open the course.
  const other = await teacher("Omar Haddad");
  await signIn(page, other);
  // The page streams, so not-found arrives after the 200 header: check what's shown.
  await page.goto(`/en/teacher/courses/${courseId}/review`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByText("Photosynthesis")).toHaveCount(0);
});

test("edit a module (#32): heading, right answer, mark as checked", async ({ page }) => {
  const t = await teacher();
  await signIn(page, t);
  const courseId = await generateFromPaste(page);

  await page.goto(`/en/teacher/courses/${courseId}/modules/1/edit`);
  await expectAccessible(page);
  await page.getByLabel("Module title").fill("How plants make sugar");
  await tick(page.getByRole("radio", { name: "Option 3 is the right answer" }));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();

  const [m] = await sql<{ heading: string; answer_index: number; checked_at: Date | null }>(
    "select m.heading, a.answer_index, m.checked_at from public.modules m join public.quiz_answers a on a.module_id = m.id where m.course_id = $1 and m.position = 1",
    [courseId],
  );
  expect(m).toMatchObject({ heading: "How plants make sugar", answer_index: 2, checked_at: null });

  // Checking a module moves on to the next one that isn't checked.
  await page.getByRole("button", { name: "Mark as checked" }).click();
  await page.waitForURL(new RegExp(`/courses/${courseId}/modules/2/edit`));
  await page.goto(`/en/teacher/courses/${courseId}/review`);
  await expect(page.getByText("1 of 3 modules checked.").first()).toBeVisible();
  const first = page.getByRole("region", { name: "Modules" }).getByRole("listitem").first();
  await expect(first).toContainText("How plants make sugar");
  await expect(first).toContainText("Checked");
});

test("assign to a class with a due date (#33): the student sees it, without the answers", async ({ page }) => {
  const t = await teacher();
  const classId = await createClass(t.id, "Biology 10");
  await signIn(page, t);
  const courseId = await generateFromPaste(page);

  await page.getByRole("link", { name: "Assign to a class" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("3 modules not checked yet.");
  await tick(dialog.getByRole("checkbox", { name: /Biology 10/ }));
  const due = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  await dialog.getByLabel("Due date").fill(due);
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Assign to Biology 10" }).click();
  // One class: back to that class, which lists the course with its due date.
  await page.waitForURL(new RegExp(`/teacher/classes/${classId}\\?assigned=${courseId}`));
  await expect(page.getByText("is assigned to this class.")).toBeVisible();
  await expect(page.getByText(/3 modules · due /)).toBeVisible();

  const [a] = await sql<{ due: string; status: string }>(
    "select a.due_date::text as due, c.status from public.course_assignments a join public.courses c on c.id = a.course_id where a.course_id = $1 and a.class_id = $2",
    [courseId, classId],
  );
  expect(a).toEqual({ due, status: "assigned" });

  // A student in the class sees the course; the right answers stay hidden.
  const s = await createUser(`s${Date.now()}@school.edu`, "student", "Lina Saad");
  await sql("insert into public.class_members (class_id, student_id) values ($1, $2)", [classId, s]);
  const [seen] = await asUser<{ courses: number; due: string; answers: number }>(
    s,
    `select (select count(*)::int from public.student_courses()) as courses,
            (select due_date::text from public.student_courses() limit 1) as due,
            (select count(*)::int from public.quiz_answers) as answers`,
  );
  expect(seen).toEqual({ courses: 1, due, answers: 0 });
});

test("export as HTML (#34): the teacher's file has the course; nobody else can export it", async ({ page }) => {
  const t = await teacher();
  await signIn(page, t);
  const courseId = await generateFromPaste(page);

  const res = await page.request.get(`/api/courses/${courseId}/export`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/html");
  expect(res.headers()["content-disposition"]).toMatch(/^attachment; filename="/);
  const html = await res.text();
  expect(html).toContain("<html lang=\"en\"");
  expect(html).toContain("Made with CourseCapture.");
  expect(html).not.toMatch(/<script[\s>]/i);

  const other = await teacher("Omar Haddad");
  await signIn(page, other);
  expect((await page.request.get(`/api/courses/${courseId}/export`)).status()).toBe(404);
});

test("daily limit (#35): the 21st generation of the day is refused", async ({ page }) => {
  const t = await teacher();
  await sql("insert into public.ai_usage (user_id, kind) select $1, 'generate' from generate_series(1, 20)", [t.id]);
  await signIn(page, t);
  await page.goto("/en/teacher/courses/new");
  await expect(page.getByText("No generations left today.")).toBeVisible();
  await page.getByRole("button", { name: /paste text instead/i }).click();
  await page.locator("textarea[name=text]").fill(SOURCE);
  // The button can't start a 21st generation (the database also refuses it: tests/db/generation.test.ts).
  const submit = page.locator("button[type=submit]");
  await expect(submit).toHaveAttribute("aria-disabled", "true");
  await submit.click({ force: true });
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/courses\/new/);
  const [{ n }] = await sql<{ n: number }>("select count(*)::int as n from public.courses where teacher_id = $1", [t.id]);
  expect(n).toBe(0);
});

test("Arabic (#29–#32): right to left, Arabic course content, accessible", async ({ page }) => {
  const t = await teacher("نادية رحمة", "ar");
  await signIn(page, t);
  await page.goto("/ar/teacher/courses/new");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expectAccessible(page);
  const courseId = await generateFromPaste(page, SOURCE, "ar", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expectAccessible(page);
  const [c] = await sql<{ content_locale: string }>("select content_locale from public.courses where id = $1", [courseId]);
  expect(c.content_locale).toBe("ar");
});

test("dark theme: the builder screens pass accessibility checks", async ({ page }) => {
  const t = await teacher();
  await signIn(page, t, { theme: "dark" });
  const courseId = await generateFromPaste(page);
  await expectAccessible(page);
  await page.goto(`/en/teacher/courses/${courseId}/modules/1/edit`);
  await expectAccessible(page);
  await page.goto(`/en/teacher/courses/${courseId}/preview`);
  await expectAccessible(page);
});
