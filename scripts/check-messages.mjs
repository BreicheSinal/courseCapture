#!/usr/bin/env node
/**
 * Fails if any locale in src/messages is missing a key from en.json, or has extra keys.
 * Run with `pnpm i18n:check` (also runs in CI).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "messages");

export function flatKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

export function compareLocales() {
  const load = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  const base = new Set(flatKeys(load("en.json")));
  const problems = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
    const keys = new Set(flatKeys(load(file)));
    for (const k of base) if (!keys.has(k)) problems.push(`${file}: missing ${k}`);
    for (const k of keys) if (!base.has(k)) problems.push(`${file}: extra ${k}`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = compareLocales();
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("✓ All locales have the same keys as en.json");
}
