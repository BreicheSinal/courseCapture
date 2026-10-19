import { expect, test } from "@playwright/test";
import { closeDb, createUser, expectAccessible, expectPhoneFriendly, signIn } from "./helpers";

/**
 * The public site (#58, #59): `/` for visitors and signed-in people, the legal
 * and contact pages, and what search engines and link previews read.
 */
test.afterAll(closeDb);

test("a visitor sees the marketing page with Sign in and Talk to us", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Turn papers and slides into courses/);
  const hero = page.locator("section", { has: page.locator("#hero-title") });
  await expect(hero.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/en/sign-in");
  await expect(hero.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", "/en/contact");
  for (const name of ["How it works", "For teachers", "For students", "Four languages, right to left included", "Privacy, built in", "Questions"]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/en/privacy");
  await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/en/terms");

  // Search and link previews.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^index, follow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/en$/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expectAccessible(page);
});

test("the animations can be paused, and only the page's theme is downloaded", async ({ page }) => {
  await page.goto("/en");
  const img = page.locator("picture.cc-mk-light img").first();
  await expect(img).toHaveAttribute("src", "/marketing/light/create.webp");
  await page.getByRole("button", { name: "Pause the teacher recording" }).click();
  await expect(img).toHaveAttribute("src", "/marketing/light/create-poster.webp");
  await page.getByRole("button", { name: "Play the teacher recording" }).click();
  await expect(img).toHaveAttribute("src", "/marketing/light/create.webp");
  await expect(page.getByRole("button", { name: "Pause the student recording" })).toBeVisible();

  // Scroll everything into view, then check no dark screen was fetched in Light.
  const fetched: string[] = [];
  page.on("request", (r) => fetched.push(new URL(r.url()).pathname));
  await page.reload();
  for (let y = 0; y < 9000; y += 700) await page.evaluate((top) => window.scrollTo({ top }), y);
  await page.waitForLoadState("networkidle");
  expect(fetched.filter((p) => p.startsWith("/marketing/light/")).length).toBeGreaterThan(5);
  expect(fetched.filter((p) => p.startsWith("/marketing/dark/"))).toEqual([]);
});

test("Dark and Arabic: no axe violations, right to left", async ({ page, context }) => {
  await context.addCookies([{ name: "cc-theme", value: "dark", domain: "localhost", path: "/" }]);
  await page.goto("/en");
  await expectAccessible(page);
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("حوّل الأوراق والشرائح إلى دورات يتابعها صفّك");
  await expectAccessible(page);
});

test("signed-in teachers and students get a button to their home; /app sends them there", async ({ page }) => {
  const stamp = Date.now();
  const teacher = await createUser(`mt${stamp}@school.edu`, "teacher", "Nadia Rahme");
  const student = await createUser(`ms${stamp}@school.edu`, "student", "Lina Saad");

  await signIn(page, { id: teacher, email: "t" });
  await page.goto("/en");
  const hero = page.locator("section", { has: page.locator("#hero-title") });
  await expect(hero.getByRole("link", { name: "Go to Classes" })).toHaveAttribute("href", "/en/teacher");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await page.goto("/en/app");
  await expect(page).toHaveURL(/\/en\/teacher\/classes/);

  await page.context().clearCookies();
  await signIn(page, { id: student, email: "s" });
  await page.goto("/fr");
  await expect(page.locator("section", { has: page.locator("#hero-title") }).getByRole("link", { name: "Aller à mes cours" })).toHaveAttribute(
    "href",
    "/fr/student",
  );

  await page.context().clearCookies();
  await page.goto("/en/app");
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test("phone: marketing, legal and contact pages fit a 390px screen", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, theme] of [
    ["/en", "light"],
    ["/ar", "dark"],
    ["/en/privacy", "light"],
    ["/ar/terms", "dark"],
    ["/es/contact", "light"],
  ] as const) {
    await context.addCookies([{ name: "cc-theme", value: theme, domain: "localhost", path: "/" }]);
    await page.goto(path);
    await expectPhoneFriendly(page, 390);
  }
});

test("privacy and terms in every language", async ({ page }) => {
  await page.goto("/en/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("Last updated: October 2026")).toBeVisible();
  await expect(page.getByRole("note")).toHaveCount(0);
  await expectAccessible(page);
  await page.goto("/ar/terms");
  await expect(page.getByRole("heading", { level: 1, name: "شروط الاستخدام" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ar\/terms$/);
  await expectAccessible(page);
});

test("contact: says what's missing, ignores bots, and reports a failed send", async ({ page }) => {
  await page.goto("/en/contact");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
  await expect(page.getByText("Enter your school's name.")).toBeVisible();
  await expect(page.getByText("Enter an email address like name@school.edu.")).toBeVisible();
  await expect(page.getByText("Write at least 20 characters so we know how to help.")).toBeVisible();

  await page.getByLabel("Your name").fill("Nadia Rahme");
  await page.getByLabel("School").fill("Lycée Saint-Joseph");
  await page.getByLabel("Email").fill("nadia@school.edu");
  await page.getByLabel("Message").fill("We'd like to try CourseCapture with two biology classes.");
  // Typed values survive a failed submit; SMTP isn't set up in tests, so the send fails and says so.
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your message couldn't be sent." })).toBeVisible();
  await expect(page.getByLabel("School")).toHaveValue("Lycée Saint-Joseph");

  // A bot fills the hidden field: it looks sent, nothing is.
  await page.locator('input[name="cc_hp"]').fill("https://spam.example", { force: true });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Message sent" })).toBeFocused();
  await page.getByRole("button", { name: "Send another message" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("");
});

test("sitemap, robots and the social preview", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(urls).toHaveLength(16);
  for (const l of ["en", "ar", "fr", "es"]) {
    expect(urls).toEqual(expect.arrayContaining([`/${l}`, `/${l}/privacy`, `/${l}/terms`, `/${l}/contact`]));
  }
  expect(urls.filter((u) => /teacher|student|admin|sign-in|app/.test(u))).toEqual([]);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /en/teacher");
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const og = await request.get("/en/opengraph-image");
  expect(og.ok()).toBe(true);
  expect(og.headers()["content-type"]).toBe("image/png");
});

test("app pages stay out of search results", async ({ page }) => {
  await page.goto("/en/sign-in");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
