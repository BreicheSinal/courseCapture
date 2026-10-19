import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createTranslator } from "next-intl";
import { closeDb, createUser, expectAccessible, signIn, sql } from "./helpers";

/**
 * The whole classroom loop, through the screens (#40):
 * teacher creates a class, posts an announcement, builds and assigns a course;
 * a student joins with the code, reads every module, answers each quick check
 * and gets the certificate; the teacher's roster shows the result.
 *
 * Runs twice: English in Light (left to right) and Arabic in Dark (right to left).
 * Buttons and links are found by their translated labels (src/messages/*.json),
 * so a missing or untranslated string fails the Arabic run. Every screen gets
 * an axe check in its theme and direction.
 */
const SOURCE =
  "Photosynthesis\n\nPlants turn light into chemical energy. Chlorophyll in the chloroplasts absorbs red and blue light.\n\n" +
  "The light-dependent reactions split water and release oxygen. The Calvin cycle then fixes carbon dioxide into sugar.";

const messages = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, "utf8"));

const variants = [
  {
    locale: "en" as const,
    theme: "light" as const,
    dir: "ltr",
    teacher: "Nadia Rahme",
    student: "Lina Saad",
    cls: "Biology 10",
  },
  {
    locale: "ar" as const,
    theme: "dark" as const,
    dir: "rtl",
    teacher: "نادية رحمة",
    student: "لينا سعد",
    cls: "أحياء ١٠",
  },
];

test.describe.configure({ timeout: 300_000 });
test.afterAll(closeDb);

for (const v of variants) {
  test(`teacher and student, start to finish (${v.locale}, ${v.theme}, ${v.dir})`, async ({ browser }) => {
    const t = createTranslator({ locale: v.locale, messages: messages(v.locale) });
    const stamp = `${Date.now()}${v.locale}`;
    const teacher = { id: "", email: `ct${stamp}@school.edu` };
    const student = { id: "", email: `cs${stamp}@school.edu` };
    teacher.id = await createUser(teacher.email, "teacher", v.teacher, { uiLocale: v.locale });
    student.id = await createUser(student.email, "student", v.student, { uiLocale: v.locale });

    // Separate browser contexts, as two people on two devices.
    const tc = await browser.newContext();
    const sc = await browser.newContext();
    const tp = await tc.newPage();
    const sp = await sc.newPage();
    await signIn(tp, teacher, { theme: v.theme });
    await signIn(sp, student, { theme: v.theme });

    /** The page is in this run's language, direction and theme, and passes axe. */
    const check = async (page: Page) => {
      await page.waitForLoadState("networkidle");
      await expect(page.locator("html")).toHaveAttribute("lang", v.locale);
      await expect(page.locator("html")).toHaveAttribute("dir", v.dir);
      await expect(page.locator("html")).toHaveAttribute("data-theme", v.theme);
      await expectAccessible(page);
    };

    let classId = "";
    let code = "";
    await test.step("teacher creates a class", async () => {
      await tp.goto(`/${v.locale}/teacher/classes/new`);
      await check(tp);
      await tp.getByLabel(t("teacher.classForm.name")).fill(v.cls);
      await tp.getByRole("button", { name: t("teacher.classForm.create") }).click();
      await expect(tp.getByText(t("teacher.classForm.created"))).toBeVisible();
      await check(tp);
      [{ id: classId, join_code: code }] = await sql<{ id: string; join_code: string }>(
        "select id, join_code from public.classes where teacher_id = $1",
        [teacher.id],
      );
      // The code on screen is the class's real code.
      await expect(tp.getByText(code, { exact: true }).first()).toBeVisible();
    });

    const note = v.locale === "ar" ? "أحضروا دفاتر المختبر يوم الخميس." : "Bring your lab notebooks on Thursday.";
    await test.step("teacher posts an announcement", async () => {
      await tp.goto(`/${v.locale}/teacher/classes/${classId}/announcements`);
      await check(tp);
      await tp.getByLabel(t("teacher.announcements.new")).fill(note);
      await tp.getByRole("button", { name: t("teacher.announcements.post", { name: v.cls }) }).click();
      await expect(tp.getByText(t("teacher.announcements.posted"))).toBeVisible();
      await expect(tp.locator("main").getByText(note)).toBeVisible();
    });

    let courseId = "";
    await test.step("teacher builds a course and assigns it with a due date", async () => {
      await tp.goto(`/${v.locale}/teacher/courses/new`);
      await check(tp);
      await tp.getByRole("button", { name: t("teacher.newCourse.pasteText") }).click();
      await tp.locator("textarea[name=text]").fill(SOURCE);
      await tp.locator("select[name=content_locale]").selectOption(v.locale);
      await tp.locator("button[type=submit]").click();
      await tp.waitForURL(/\/review/, { timeout: 90_000 });
      courseId = /courses\/([0-9a-f-]{36})\//.exec(tp.url())![1];
      await check(tp);

      await tp.getByRole("link", { name: t("teacher.review.assign") }).click();
      const dialog = tp.getByRole("dialog");
      await dialog
        .getByRole("checkbox", { name: new RegExp(v.cls) })
        .locator("xpath=ancestor::label[1]")
        .click();
      const due = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      await dialog.getByLabel(t("teacher.assign.due")).fill(due);
      await check(tp);
      await dialog.getByRole("button", { name: t("teacher.assign.assignTo", { name: v.cls }) }).click();
      await tp.waitForURL(new RegExp(`/teacher/classes/${classId}\\?assigned=`));
      await check(tp);
    });

    await test.step("student joins with the code", async () => {
      await sp.goto(`/${v.locale}/student/join`);
      await check(sp);
      // Typed in lower case with spaces, as people do; the app tidies it.
      await sp.getByLabel(t("student.join.code")).fill(` ${code.toLowerCase()} `);
      await sp.getByRole("button", { name: t("student.join.join") }).click();
      await sp.waitForURL(new RegExp(`/student/classes/${classId}`));
      await check(sp);
      await expect(sp.locator("main").getByText(note)).toBeVisible();
    });

    await test.step("student sees the course and the announcement on Home", async () => {
      await sp.goto(`/${v.locale}/student`);
      await check(sp);
      await expect(sp.locator("main").getByText(note)).toBeVisible();
      await sp.goto(`/${v.locale}/student/courses/${courseId}`);
      await check(sp);
    });

    const modules = await sql<{ position: number; answer_index: number }>(
      "select m.position, q.answer_index from public.modules m join public.quiz_answers q on q.module_id = m.id where m.course_id = $1 order by m.position",
      [courseId],
    );
    expect(modules.length).toBeGreaterThan(1);

    for (const m of modules) {
      await test.step(`student reads module ${m.position} and answers its quick check`, async () => {
        if (m.position === 1) await sp.getByRole("link", { name: t("student.overview.start") }).click();
        await sp.waitForURL(new RegExp(`/modules/${m.position}$`));
        await check(sp);
        await sp.getByRole("link", { name: t("student.reader.toQuiz") }).click();
        await sp.waitForURL(new RegExp(`/modules/${m.position}/check$`));
        await check(sp);
        // The first option the student picks counts; pick the right one for every module but the last.
        const options = sp.getByRole("group").getByRole("button");
        const right = m.position < modules.length;
        const pick = right ? m.answer_index : (m.answer_index + 1) % (await options.count());
        await options.nth(pick).click();
        await expect(sp.getByText(right ? t("student.quiz.rightTitle") : t("student.quiz.wrongTitle"))).toBeVisible();
        await check(sp);
        const last = m.position === modules.length;
        await sp
          .getByRole("button", { name: last ? t("student.reader.completeFinish") : t("student.reader.completeNext") })
          .click();
      });
    }

    await test.step("student finishes and sees the certificate", async () => {
      await sp.waitForURL(new RegExp(`/student/courses/${courseId}/finish`));
      await check(sp);
      await expect(sp.getByText(t("student.finish.certificate"))).toBeVisible();
      await expect(sp.getByText(v.student).first()).toBeVisible();
      await expect(sp.getByRole("button", { name: t("student.finish.save") })).toBeVisible();
    });

    await test.step("teacher sees the student's progress on the roster", async () => {
      await tp.goto(`/${v.locale}/teacher/classes/${classId}/students`);
      await check(tp);
      const row = tp.locator("main").getByText(v.student).first();
      await expect(row).toBeVisible();
      const [p] = await sql<{ done: number; right: number; answered: number }>(
        `select (select count(*)::int from public.module_progress where student_id = $1) as done,
                (select count(*)::int from public.quiz_attempts where student_id = $1 and is_first and is_correct) as right,
                (select count(*)::int from public.quiz_attempts where student_id = $1 and is_first) as answered`,
        [student.id],
      );
      expect(p).toEqual({ done: modules.length, right: modules.length - 1, answered: modules.length });
      // The roster says it in words: first-time quiz score as a percentage.
      await expect(
        tp.locator("main").getByText(t("teacher.roster.quiz", { pct: (modules.length - 1) / modules.length })),
      ).toBeVisible();
    });

    await tc.close();
    await sc.close();
  });
}
