import { expect, test } from "@playwright/test";
import { closeDb, createClass, createUser, expectAccessible, expectPhoneFriendly, signIn, sql } from "./helpers";

/**
 * Every screen on a 390px phone (#61), in English (Light) and Arabic (Dark, right to left):
 * no sideways scrolling or zoom-out, 44px targets, 16px input text, no axe violations.
 * Runs only in the "phone" project (playwright.config.ts). Long names on purpose.
 */
const WIDTH = 390;
const SOURCE =
  "Photosynthesis and the long journey of light through the chloroplast membranes\n\n" +
  "Plants turn light into chemical energy. Chlorophyll in the chloroplasts absorbs red and blue light, and reflects green.\n\n" +
  "The light-dependent reactions split water and release oxygen. The Calvin cycle then fixes carbon dioxide into sugar.";

let ids: { teacher: string; student: string; admin: string; cls: string; course: string };

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const teacher = await createUser(`pt${stamp}@school.edu`, "teacher", "Nadia Abou-Rahme El-Khoury");
  const cls = await createClass(teacher, "Biology 10 — advanced placement section");
  const student = await createUser(`ps${stamp}@school.edu`, "student", "Lina Saad Al-Hariri");
  await sql("insert into public.class_members (class_id, student_id) values ($1, $2)", [cls, student]);
  await sql("insert into public.announcements (class_id, author_id, body) values ($1, $2, $3)", [
    cls,
    teacher,
    "Bring your lab notebooks on Thursday. We'll review the Calvin cycle and do the leaf-disc experiment together.",
  ]);
  const admin = await createUser(`pa${stamp}@school.edu`, "teacher", "Site Admin");
  await sql("update public.profiles set role = 'admin' where id = $1", [admin]);
  await createUser(`pp${stamp}@school.edu`, "teacher", "Pending Teacher With A Long Name", { approved: false });

  const page = await browser.newPage();
  await signIn(page, { id: teacher, email: "t" });
  await page.goto("/en/teacher/courses/new");
  await page.getByRole("button", { name: /paste text instead/i }).click();
  await page.locator("textarea[name=text]").fill(SOURCE);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/review/, { timeout: 90_000 });
  const course = /courses\/([0-9a-f-]{36})\//.exec(page.url())![1];
  await page.close();
  await sql("insert into public.course_assignments (course_id, class_id, due_date) values ($1, $2, current_date + 7)", [
    course,
    cls,
  ]);
  await sql("update public.courses set status = 'assigned', assigned_at = now() where id = $1", [course]);
  // Mark every module checked, as a teacher who has reviewed the course would:
  // the ✓ marks in the module list once stretched the page sideways.
  await sql("update public.modules set checked_at = now(), review_note = null where course_id = $1", [course]);
  ids = { teacher, student, admin, cls, course };
});

test.afterAll(closeDb);

const screens = () => ({
  teacher: [
    "/teacher/classes",
    "/teacher/classes/new",
    `/teacher/classes/${ids.cls}`,
    `/teacher/classes/${ids.cls}/edit`,
    `/teacher/classes/${ids.cls}/delete`,
    `/teacher/classes/${ids.cls}/students`,
    `/teacher/classes/${ids.cls}/students/${ids.student}?course=${ids.course}`,
    `/teacher/classes/${ids.cls}/announcements`,
    "/teacher/courses",
    "/teacher/courses/new",
    `/teacher/courses/${ids.course}/review`,
    `/teacher/courses/${ids.course}/modules/1/edit`,
    `/teacher/courses/${ids.course}/assign`,
    `/teacher/courses/${ids.course}/preview`,
    "/teacher/settings",
  ],
  student: [
    "/student",
    "/student/join",
    "/student/classes",
    `/student/classes/${ids.cls}`,
    `/student/courses/${ids.course}`,
    `/student/courses/${ids.course}/modules/1`,
    `/student/courses/${ids.course}/modules/1/check`,
    "/student/account",
  ],
  admin: ["/admin/teachers", "/admin/invites"],
  // "Check your email" sends a visitor who hasn't asked for a link back to sign-in, so it can't be opened directly.
  public: ["/sign-in"],
});

for (const v of [
  { locale: "en", theme: "light" as const },
  { locale: "ar", theme: "dark" as const },
]) {
  for (const who of ["public", "teacher", "student", "admin"] as const) {
    test(`${who} screens fit a phone (${v.locale}, ${v.theme})`, async ({ page, context }) => {
      test.setTimeout(240_000);
      if (who === "public")
        await context.addCookies([{ name: "cc-theme", value: v.theme, domain: "localhost", path: "/" }]);
      else await signIn(page, { id: ids[who], email: who }, { theme: v.theme });
      for (const path of screens()[who]) {
        await test.step(path, async () => {
          await page.goto(`/${v.locale}${path}`);
          await page.waitForLoadState("networkidle");
          if (v.locale === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
          await expectPhoneFriendly(page, WIDTH);
          await expectAccessible(page);
        });
      }
    });
  }
}

test("the module editor's buttons stay above the tab bar", async ({ page }) => {
  await signIn(page, { id: ids.teacher, email: "t" });
  await page.goto(`/en/teacher/courses/${ids.course}/modules/1/edit`);
  const bar = page.getByRole("button", { name: "Save changes" });
  const tabs = page.getByRole("navigation", { name: "Main", exact: true });
  await page.mouse.wheel(0, 600);
  const [b, t] = [await bar.boundingBox(), await tabs.boundingBox()];
  expect(b!.y + b!.height).toBeLessThanOrEqual(t!.y);
});
