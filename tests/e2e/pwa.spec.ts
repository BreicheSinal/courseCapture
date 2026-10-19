import { expect, test, type Page } from "@playwright/test";
import { closeDb, createClass, createUser, expectAccessible, signIn, sql } from "./helpers";

/**
 * Installable app and offline reading (#37), with the service worker on (NEXT_PUBLIC_SW=1).
 */
const SOURCE =
  "Photosynthesis\n\nPlants turn light into chemical energy. Chlorophyll in the chloroplasts absorbs red and blue light.\n\n" +
  "The light-dependent reactions split water and release oxygen. The Calvin cycle then fixes carbon dioxide into sugar.";

let ids: { teacher: string; student: string; course: string; cls: string };

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const teacher = await createUser(`wt${stamp}@school.edu`, "teacher", "Nadia Rahme");
  const cls = await createClass(teacher, "Biology 10");
  const student = await createUser(`ws${stamp}@school.edu`, "student", "Lina Saad");
  await sql("insert into public.class_members (class_id, student_id) values ($1, $2)", [cls, student]);
  const page = await browser.newPage();
  await signIn(page, { id: teacher, email: "t" });
  await page.goto("/en/teacher/courses/new");
  await page.getByRole("button", { name: /paste text instead/i }).click();
  await page.locator("textarea[name=text]").fill(SOURCE);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/review/, { timeout: 90_000 });
  const course = /courses\/([0-9a-f-]{36})\//.exec(page.url())![1];
  await page.close();
  await sql("insert into public.course_assignments (course_id, class_id) values ($1, $2)", [course, cls]);
  await sql("update public.courses set status = 'assigned', assigned_at = now() where id = $1", [course]);
  ids = { teacher, student, course, cls };
});

test.afterAll(closeDb);

/** Waits until the service worker controls the page (a reload hands the page to it the first time). */
async function controlled(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.ready.then(() => true), null, { timeout: 30_000 });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });
}

/**
 * Takes the device off the network, service worker included. Playwright only
 * routes service-worker requests with PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1
 * (playwright.config.ts), so every request is also aborted at the context level.
 */
async function goOffline(context: import("@playwright/test").BrowserContext) {
  await context.setOffline(true);
  await context.route("**/*", (route) => route.abort("internetdisconnected"));
}

/** Paths saved for offline reading, from the page's side. */
const savedPaths = (page: Page) =>
  page.evaluate(async () => {
    const names = (await caches.keys()).filter((k) => k.startsWith("cc-pages-"));
    const paths: string[] = [];
    for (const n of names) for (const r of await (await caches.open(n)).keys()) paths.push(new URL(r.url).pathname);
    return paths.filter((p) => !p.endsWith("/offline")).sort();
  });

test("installable: manifest, icons and head tags (X5)", async ({ page, request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: "CourseCapture", start_url: "/", display: "standalone" });
  expect(manifest.icons.map((i: { purpose?: string; sizes: string }) => `${i.sizes} ${i.purpose ?? "any"}`)).toEqual(
    expect.arrayContaining(["192x192 any", "512x512 any", "512x512 maskable"]),
  );
  for (const icon of [...manifest.icons.map((i: { src: string }) => i.src), "/apple-touch-icon.png"]) {
    const r = await request.get(icon);
    expect(r.ok(), icon).toBe(true);
    expect(r.headers()["content-type"]).toMatch(/^image\//);
  }

  await page.goto("/en/sign-in");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute("href", "/favicon.svg");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", /^#/);
  const sw = await request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-store");
});

test("offline: a student reads modules they opened; other pages say they're offline", async ({ page, context }) => {
  await signIn(page, { id: ids.student, email: "s" });
  const base = `/en/student/courses/${ids.course}`;
  await page.goto(`${base}/modules/1`);
  await controlled(page);
  // Open the overview and module 1 while online (saved as they load).
  await page.goto(base);
  await page.goto(`${base}/modules/1`);
  await expect.poll(() => savedPaths(page)).toEqual([base, `${base}/modules/1`].sort());

  await goOffline(context);
  await page.goto(`${base}/modules/1`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Part 1");
  await expect(page.getByRole("status").filter({ hasText: "You're offline." })).toBeVisible();

  await page.goto(`${base}/modules/2`); // never opened
  await expect(page.getByRole("heading", { name: "You're offline", level: 1 })).toBeVisible();
  await expectAccessible(page);

  await page.goto("/ar/student"); // other pages, in the person's language
  await expect(page.getByRole("heading", { name: "أنت غير متصل بالإنترنت", level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("privacy: signing out deletes saved pages, and teacher pages are never saved", async ({ page, context }) => {
  await signIn(page, { id: ids.student, email: "s" });
  const base = `/en/student/courses/${ids.course}`;
  await page.goto(`${base}/modules/1`);
  await controlled(page);
  await page.goto(`${base}/modules/1`);
  await expect.poll(() => savedPaths(page)).toContain(`${base}/modules/1`);

  // Signed out (the sign-in page tells the worker nobody is signed in).
  await context.clearCookies();
  await page.goto("/en/sign-in");
  await expect.poll(() => savedPaths(page)).toEqual([]);

  // A teacher on the same device: their pages are never saved.
  await signIn(page, { id: ids.teacher, email: "t" });
  await page.goto(`/en/teacher/classes/${ids.cls}`);
  await page.goto(`/en/teacher/courses/${ids.course}/review`);
  await page.waitForTimeout(500);
  expect(await savedPaths(page)).toEqual([]);
});
