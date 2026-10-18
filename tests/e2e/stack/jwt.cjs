/**
 * HS256 JWTs for the Supabase stand-in. CommonJS so playwright.config.ts,
 * the tests and the stand-in (ESM) can all load it.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS on purpose, see above
const { createHmac } = require("node:crypto");

const SECRET = process.env.JWT_SECRET || "super-secret-jwt-token-with-at-least-32-characters";
const b64url = (b) => Buffer.from(b).toString("base64url");

function sign(payload) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ iat: now, exp: now + 86400, ...payload }));
  const sig = createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

function verify(token) {
  const [head, body, sig] = String(token || "").split(".");
  if (!sig || createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url") !== sig) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString());
  return claims.exp && claims.exp < Date.now() / 1000 ? null : claims;
}

// Fixed claims so the keys are the same on every run.
const anonKey = sign({ role: "anon", iss: "standin", iat: 1700000000, exp: 4102444800 });
const serviceKey = sign({ role: "service_role", iss: "standin", iat: 1700000000, exp: 4102444800 });

module.exports = { sign, verify, anonKey, serviceKey };
