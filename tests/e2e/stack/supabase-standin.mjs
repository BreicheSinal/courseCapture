#!/usr/bin/env node
/**
 * A small stand-in for the Supabase API, for end-to-end tests where Docker
 * (and so `supabase start`) isn't available. It is NOT Supabase: it covers
 * only the calls this app makes, on top of a real Postgres with the real
 * migrations, so row-level security still decides every read and write.
 *
 *   /auth/v1/user                GoTrue: the user behind a JWT
 *   /rest/v1/<table>             PostgREST: select / insert / update / delete with eq, in, is, not.is, order, limit
 *   /rest/v1/rpc/<function>      PostgREST: call a function with named arguments
 *   /storage/v1/object/...       Storage: signed uploads, upload, list, download, remove (files kept in memory)
 *
 * Each request runs as its JWT's role (anon, authenticated or service_role)
 * with request.jwt.claim.sub set, like PostgREST.
 *
 * Usage: DATABASE_URL=postgres://… JWT_SECRET=… node tests/e2e/stack/supabase-standin.mjs
 * Prints the anon and service-role keys on start (tests/e2e/README.md).
 */
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import pg from "pg";
import jwt from "./jwt.cjs";

const PORT = Number(process.env.PORT ?? 54321);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres",
  max: 10,
});

// ---------------------------------------------------------------- JWT
const { sign, verify, anonKey, serviceKey } = jwt;
export { sign, anonKey, serviceKey };

// ---------------------------------------------------------------- helpers
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range,content-type",
};
function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, { ...cors, ...(isBuf ? {} : { "content-type": "application/json" }), ...headers });
  res.end(body === undefined ? "" : isBuf ? body : JSON.stringify(body));
}
const readBody = (req) =>
  new Promise((resolve, reject) => {
    const parts = [];
    req.on("data", (c) => parts.push(c));
    req.on("end", () => resolve(Buffer.concat(parts)));
    req.on("error", reject);
  });
const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { status: 400 });
  return `"${s}"`;
};
function claimsOf(req) {
  const auth = req.headers.authorization?.replace(/^Bearer /i, "") || req.headers.apikey;
  return verify(auth);
}
async function asRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = claims?.role === "service_role" ? "service_role" : claims?.sub ? "authenticated" : "anon";
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [claims?.sub ?? ""]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
function pgError(res, e) {
  const status = e.status ?? (e.code === "42501" ? 403 : e.code === "23505" ? 409 : e.code === "PGRST116" ? 406 : 400);
  send(res, status, { message: e.message, code: e.code ?? "", details: e.detail ?? null, hint: e.hint ?? null });
}

// ---------------------------------------------------------------- PostgREST subset
function filters(params, values) {
  const where = [];
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(key)) continue;
    const col = ident(key);
    let m;
    if ((m = /^eq\.(.*)$/s.exec(raw))) {
      values.push(m[1]);
      where.push(`${col}::text = $${values.length}`);
    } else if ((m = /^neq\.(.*)$/s.exec(raw))) {
      values.push(m[1]);
      where.push(`${col}::text <> $${values.length}`);
    } else if ((m = /^in\.\((.*)\)$/s.exec(raw))) {
      values.push(m[1] === "" ? [] : m[1].split(",").map((v) => v.replace(/^"|"$/g, "")));
      where.push(`${col}::text = any($${values.length}::text[])`);
    } else if ((m = /^is\.(null|true|false)$/.exec(raw))) {
      where.push(`${col} is ${m[1]}`);
    } else if ((m = /^not\.is\.(null|true|false)$/.exec(raw))) {
      where.push(`${col} is not ${m[1]}`);
    } else throw Object.assign(new Error(`unsupported filter ${key}=${raw}`), { status: 400 });
  }
  return where.length ? `where ${where.join(" and ")}` : "";
}
function columns(select) {
  if (!select || select === "*") return "*";
  return select
    .split(",")
    .map((c) => ident(c.trim()))
    .join(", ");
}
function order(o) {
  if (!o) return "";
  return (
    "order by " +
    o
      .split(",")
      .map((p) => {
        const [c, dir, nulls] = p.split(".");
        return `${ident(c)} ${dir === "desc" ? "desc" : "asc"}${nulls === "nullslast" ? " nulls last" : nulls === "nullsfirst" ? " nulls first" : ""}`;
      })
      .join(", ")
  );
}

async function rest(req, res, url, claims) {
  const name = url.pathname.replace(/^\/rest\/v1\//, "");
  const params = url.searchParams;
  const prefer = String(req.headers.prefer ?? "");
  const single = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
  const body = ["POST", "PATCH"].includes(req.method) ? (await readBody(req)).toString() : "";

  if (name.startsWith("rpc/")) {
    const fn = name.slice(4);
    const args = body ? JSON.parse(body) : Object.fromEntries(params);
    const out = await asRole(claims, async (c) => {
      const meta = await c.query(
        `select p.proretset as set, t.typtype as kind, t.typname, p.proargnames as names,
                (select array_agg(format_type(x, null)) from unnest(p.proargtypes) x) as types
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type t on t.oid = p.prorettype
         where n.nspname = 'public' and p.proname = $1 limit 1`,
        [fn],
      );
      const m = meta.rows[0];
      if (!m) throw Object.assign(new Error(`function ${fn} not found`), { status: 404 });
      const vals = [];
      const named = Object.entries(args).map(([k, v]) => {
        const i = (m.names ?? []).indexOf(k);
        const type = m.types?.[i] ?? "text";
        vals.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v);
        // Arrays come as JSON arrays; turn them into Postgres arrays.
        if (type.endsWith("[]") && Array.isArray(v)) {
          vals[vals.length - 1] = v;
          return `${ident(k)} => $${vals.length}::${type}`;
        }
        return `${ident(k)} => $${vals.length}::${type}`;
      });
      const call = `public.${ident(fn)}(${named.join(", ")})`;
      if (m.set || m.typname === "record")
        return {
          rows: (await c.query(`select to_jsonb(r) as j from ${call} r`, vals)).rows.map((r) => r.j),
          set: true,
        };
      if (m.kind === "c")
        return {
          rows: (await c.query(`select to_jsonb(r) as j from ${call} r`, vals)).rows.map((r) => r.j),
          set: false,
        };
      if (m.typname === "void") {
        await c.query(`select ${call}`, vals);
        return { value: null };
      }
      return { value: (await c.query(`select to_jsonb(${call}) as j`, vals)).rows[0].j };
    });
    if ("value" in out) return send(res, 200, out.value);
    return send(res, 200, out.set ? out.rows : (out.rows[0] ?? null));
  }

  const table = `public.${ident(name)}`;
  const values = [];
  const where = filters(params, values);
  const ret = columns(params.get("select"));
  const wantRows = prefer.includes("return=representation") || req.method === "GET" || req.method === "HEAD";
  const counting = prefer.includes("count=exact");

  const rows = await asRole(claims, async (c) => {
    if (req.method === "GET" || req.method === "HEAD") {
      const limit = params.get("limit") ? `limit ${Number(params.get("limit"))}` : "";
      const r = await c.query(
        `select coalesce(json_agg(t), '[]') as j from (select ${ret} from ${table} ${where} ${order(params.get("order"))} ${limit}) t`,
        values,
      );
      let count = null;
      if (counting) count = (await c.query(`select count(*)::int as n from ${table} ${where}`, values)).rows[0].n;
      return { rows: r.rows[0].j, count };
    }
    if (req.method === "POST") {
      const data = JSON.parse(body);
      const list = Array.isArray(data) ? data : [data];
      const cols = [...new Set(list.flatMap((o) => Object.keys(o)))];
      values.push(JSON.stringify(list));
      const sql = `insert into ${table} (${cols.map(ident).join(", ")})
        select ${cols.map(ident).join(", ")} from json_populate_recordset(null::${table}, $${values.length}::json)
        returning ${ret}`;
      const r = await c.query(
        `with ins as (${sql}) select coalesce(json_agg(ins), '[]') as j, count(*)::int as n from ins`,
        values,
      );
      return { rows: r.rows[0].j, count: r.rows[0].n };
    }
    if (req.method === "PATCH") {
      const data = JSON.parse(body);
      values.push(JSON.stringify(data));
      const p = `$${values.length}::json`;
      const sets = Object.keys(data).map(
        (k) => `${ident(k)} = (json_populate_record(null::${table}, ${p})).${ident(k)}`,
      );
      const r = await c.query(
        `with up as (update ${table} set ${sets.join(", ")} ${where} returning ${ret}) select coalesce(json_agg(up), '[]') as j, count(*)::int as n from up`,
        values,
      );
      return { rows: r.rows[0].j, count: r.rows[0].n };
    }
    if (req.method === "DELETE") {
      const r = await c.query(
        `with del as (delete from ${table} ${where} returning ${ret}) select coalesce(json_agg(del), '[]') as j, count(*)::int as n from del`,
        values,
      );
      return { rows: r.rows[0].j, count: r.rows[0].n };
    }
    throw Object.assign(new Error("method not allowed"), { status: 405 });
  });

  const headers =
    rows.count !== null && rows.count !== undefined
      ? { "content-range": `0-${Math.max(0, rows.rows.length - 1)}/${rows.count}` }
      : {};
  if (req.method === "HEAD") return send(res, 200, undefined, headers);
  if (single) {
    if (rows.rows.length !== 1)
      return send(res, 406, {
        message: "JSON object requested, multiple (or no) rows returned",
        code: "PGRST116",
        details: `The result contains ${rows.rows.length} rows`,
      });
    return send(res, 200, rows.rows[0], headers);
  }
  if (!wantRows) return send(res, 204, undefined, headers);
  return send(res, req.method === "POST" ? 201 : 200, rows.rows, headers);
}

// ---------------------------------------------------------------- Storage subset (in memory)
const objects = new Map(); // "bucket/path" -> { data, type, created_at, id }
const uploadTokens = new Map(); // token -> "bucket/path"

async function storage(req, res, url, claims) {
  const path = decodeURIComponent(url.pathname.replace(/^\/storage\/v1/, ""));
  let m;
  if (req.method === "POST" && (m = /^\/object\/upload\/sign\/(.+)$/.exec(path))) {
    if (claims?.role !== "service_role") return send(res, 403, { message: "service role only" });
    const token = randomUUID();
    uploadTokens.set(token, m[1]);
    return send(res, 200, { url: `/object/upload/sign/${m[1]}?token=${token}` });
  }
  if (req.method === "PUT" && (m = /^\/object\/upload\/sign\/(.+)$/.exec(path))) {
    const key = uploadTokens.get(url.searchParams.get("token") ?? "");
    if (!key || key !== m[1]) return send(res, 400, { message: "invalid token" });
    uploadTokens.delete(url.searchParams.get("token"));
    if (objects.has(key)) return send(res, 409, { message: "The resource already exists" });
    const data = await readBody(req);
    if (data.length > 20 * 1024 * 1024) return send(res, 413, { message: "Payload too large" });
    objects.set(key, {
      data,
      type: req.headers["content-type"] ?? "application/octet-stream",
      created_at: new Date().toISOString(),
      id: randomUUID(),
    });
    return send(res, 200, { Key: key });
  }
  if (req.method === "POST" && (m = /^\/object\/list\/([^/]+)$/.exec(path))) {
    if (claims?.role !== "service_role") return send(res, 200, []);
    const { prefix = "", limit = 100 } = JSON.parse((await readBody(req)).toString() || "{}");
    const base = `${m[1]}/${prefix ? prefix.replace(/\/$/, "") + "/" : ""}`;
    const seen = new Map();
    for (const [key, o] of objects) {
      if (!key.startsWith(base)) continue;
      const rest = key.slice(base.length);
      const [first, ...more] = rest.split("/");
      if (more.length) seen.set(first, { name: first, id: null, created_at: null, metadata: null });
      else
        seen.set(first, {
          name: first,
          id: o.id,
          created_at: o.created_at,
          metadata: { size: o.data.length, mimetype: o.type },
        });
    }
    return send(res, 200, [...seen.values()].slice(0, limit));
  }
  if (req.method === "POST" && (m = /^\/object\/([^/]+)\/(.+)$/.exec(path))) {
    if (claims?.role !== "service_role") return send(res, 403, { message: "service role only" });
    const raw = await readBody(req);
    let data = raw;
    let type = req.headers["content-type"] ?? "application/octet-stream";
    if (String(type).startsWith("multipart/form-data")) {
      const form = await new Response(raw, { headers: { "content-type": type } }).formData();
      const file = [...form.values()].find((v) => typeof v !== "string");
      data = Buffer.from(await file.arrayBuffer());
      type = file.type || "application/octet-stream";
    }
    const key = `${m[1]}/${m[2]}`;
    if (objects.has(key) && req.headers["x-upsert"] !== "true")
      return send(res, 409, { message: "The resource already exists" });
    objects.set(key, { data, type, created_at: new Date().toISOString(), id: randomUUID() });
    return send(res, 200, { Key: key, Id: objects.get(key).id });
  }
  if (req.method === "GET" && (m = /^\/object\/(?:authenticated\/)?([^/]+)\/(.+)$/.exec(path))) {
    if (claims?.role !== "service_role") return send(res, 400, { message: "Object not found" });
    const o = objects.get(`${m[1]}/${m[2]}`);
    if (!o) return send(res, 400, { message: "Object not found", statusCode: "404" });
    return send(res, 200, o.data, { "content-type": o.type });
  }
  if (req.method === "DELETE" && (m = /^\/object\/([^/]+)$/.exec(path))) {
    if (claims?.role !== "service_role") return send(res, 403, { message: "service role only" });
    const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || "{}");
    const removed = prefixes.filter((p) => objects.delete(`${m[1]}/${p}`)).map((p) => ({ name: p }));
    return send(res, 200, removed);
  }
  if (req.method === "GET" && path === "/_debug/objects") return send(res, 200, [...objects.keys()]);
  return send(res, 404, { message: `storage stand-in: no route for ${req.method} ${path}` });
}

// ---------------------------------------------------------------- server
async function handle(req, res) {
  if (req.method === "OPTIONS") return send(res, 204);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const claims = claimsOf(req);
  try {
    if (url.pathname === "/auth/v1/user") {
      if (!claims?.sub) return send(res, 401, { code: 401, msg: "invalid JWT", error_code: "bad_jwt" });
      const r = await pool.query(
        "select id, email, raw_user_meta_data, email_confirmed_at, created_at from auth.users where id = $1",
        [claims.sub],
      );
      const u = r.rows[0];
      if (!u) return send(res, 403, { code: 403, msg: "User not found", error_code: "user_not_found" });
      return send(res, 200, {
        id: u.id,
        aud: "authenticated",
        role: "authenticated",
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.raw_user_meta_data ?? {},
        app_metadata: { provider: "email" },
        created_at: u.created_at,
      });
    }
    if (url.pathname === "/auth/v1/logout") return send(res, 204);
    if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url, claims);
    if (url.pathname.startsWith("/storage/v1/")) return await storage(req, res, url, claims);
    return send(res, 404, { message: `stand-in: no route for ${url.pathname}` });
  } catch (e) {
    if (process.env.STANDIN_DEBUG) console.error(req.method, req.url, e.message);
    return pgError(res, e);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handle).listen(PORT, () => {
    console.log(`Supabase stand-in on http://localhost:${PORT}`);
    console.log(`ANON_KEY=${anonKey}`);
    console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
  });
}
