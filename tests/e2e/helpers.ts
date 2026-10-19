import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import pg from "pg";
import jwt from "./stack/jwt.cjs";

const { sign } = jwt;

/** Database helpers and sign-in for the end-to-end tests (tests/e2e/README.md). */
const url = `${(process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres").replace(/\/[^/]*$/, "")}/${process.env.E2E_DB ?? "cc_e2e"}`;
// Opened on first use and again after closeDb(), so test files sharing a worker can each close it.
let current: pg.Pool | null = null;
const pool = () => (current ??= new pg.Pool({ connectionString: url, max: 3 }));

export const sql = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
  (await pool().query(text, params)).rows as T[];

export async function createUser(
  email: string,
  role: "teacher" | "student",
  name: string,
  opts: { approved?: boolean; uiLocale?: string } = {},
) {
  const [{ id }] = await sql<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ($1, $2, now()) returning id",
    [email, { role, full_name: name }],
  );
  await sql("update public.profiles set full_name = $2, role = $3, status = $4, ui_locale = $5 where id = $1", [
    id,
    name,
    role,
    opts.approved === false ? "pending" : "approved",
    opts.uiLocale ?? "en",
  ]);
  return id;
}

export async function createClass(teacherId: string, name: string) {
  const c = await pool().connect();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claim.sub', $1, true)", [teacherId]);
    const r = await c.query("select * from public.create_class($1, '')", [name]);
    await c.query("commit");
    return r.rows[0].id as string;
  } finally {
    c.release();
  }
}

/** Runs `text` as a signed-in user (role authenticated), so row-level security applies. */
export async function asUser<T = Record<string, unknown>>(userId: string, text: string, params: unknown[] = []) {
  const c = await pool().connect();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const r = await c.query(text, params);
    await c.query("rollback");
    return r.rows as T[];
  } finally {
    c.release();
  }
}

/** Signs in by setting the session cookie @supabase/ssr reads (sb-<host>-auth-token, base64 encoded). */
export async function signIn(page: Page, user: { id: string; email: string }, opts: { theme?: "light" | "dark" } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: sign({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated" }),
    token_type: "bearer",
    expires_in: 86400,
    expires_at: now + 86400,
    refresh_token: "standin-refresh",
    user: {
      id: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const cookies = [{ name: "sb-localhost-auth-token", value, domain: "localhost", path: "/" }];
  if (opts.theme) cookies.push({ name: "cc-theme", value: opts.theme, domain: "localhost", path: "/" });
  await page.context().addCookies(cookies);
}

/** No axe violations at WCAG 2.2 AA (docs: Accessible). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  if (process.env.AXE_DEBUG)
    console.log(
      JSON.stringify(
        results.violations.map((v) => v.nodes.map((n) => [n.html, n.failureSummary])),
        null,
        1,
      ),
    );
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function closeDb() {
  const p = current;
  current = null;
  await p?.end();
}

/**
 * Phone layout checks (#61), run on the current page:
 * - nothing scrolls sideways, and the page doesn't make the phone zoom out;
 * - every control is at least 44px to tap (inline text links excepted; a
 *   visually hidden input is measured by its label);
 * - text in inputs is at least 16px, so iOS doesn't zoom in on focus.
 */
export async function expectPhoneFriendly(page: Page, viewportWidth: number) {
  const r = await page.evaluate((vw) => {
    const desc = (el: Element) =>
      `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").split(" ").slice(0, 3).join(".")} "${(el.textContent ?? "").trim().slice(0, 30)}"`;
    const width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
    const small: string[] = [];
    for (const el of Array.from(
      document.querySelectorAll(
        "a[href], button, select, input:not([type=hidden]), textarea, [role=button], [role=tab], summary",
      ),
    )) {
      const cs = getComputedStyle(el);
      if (cs.display === "inline" || cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.closest(".sr-only")) continue;
      let b = el.getBoundingClientRect();
      if (el.tagName === "INPUT" && b.width <= 2) {
        const label = el.closest("label");
        if (!label) continue;
        b = label.getBoundingClientRect();
      }
      // A field inside a <label class="cc-inputbox">: a tap anywhere in the box reaches it.
      const box = el.tagName === "INPUT" ? el.closest("label.cc-inputbox") : null;
      if (box) b = box.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.width < 43.5 || b.height < 43.5) small.push(`${desc(el)} ${Math.round(b.width)}×${Math.round(b.height)}`);
    }
    const tinyText = Array.from(
      document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea"),
    )
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map(desc);
    return { width, small, tinyText, vw };
  }, viewportWidth);
  expect(r.width, "page is wider than the phone").toBeLessThanOrEqual(viewportWidth);
  expect(r.small, "controls under 44px").toEqual([]);
  expect(r.tinyText, "input text under 16px").toEqual([]);
}
