/* CourseCapture service worker (issue #37, docs/architecture.md → Installable app).
 *
 * Keeps what a student needs to read offline, and nothing else:
 * - the course overview, module and quick-check pages they open (network first;
 *   the saved copy is used only when the network fails);
 * - the app's own static files (scripts, styles, fonts, icons), so those pages render;
 * - an offline page for everything else.
 * Never saved: teacher and admin pages, API and auth requests, anything that isn't a GET.
 *
 * Saved pages belong to one person. The page tells the worker who is signed in;
 * when that changes, or someone signs out, the saved pages are deleted.
 */
const VERSION = "v1";
const PAGES = `cc-pages-${VERSION}`;
const ASSETS = `cc-assets-${VERSION}`;
const META = `cc-meta-${VERSION}`;
const LOCALES = ["en", "ar", "fr", "es"];
const OFFLINE_PAGES = LOCALES.map((l) => `/${l}/offline`);

// /{locale}/student/courses/{id}, …/modules/{n}, …/modules/{n}/check
const READABLE = new RegExp(`^/(${LOCALES.join("|")})/student/courses/[^/]+(/modules/\\d+(/check)?)?/?$`);
const STATIC = /^\/(_next\/static\/|fonts\/|favicon\.svg$|icon-[\w-]+\.png$|apple-touch-icon\.png$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => Promise.allSettled(OFFLINE_PAGES.map((p) => cache.add(new Request(p, { cache: "reload" })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("cc-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Deletes every saved course page (keeps the offline pages). */
async function forgetPages() {
  const cache = await caches.open(PAGES);
  const keys = await cache.keys();
  await Promise.all(keys.filter((r) => !OFFLINE_PAGES.includes(new URL(r.url).pathname)).map((r) => cache.delete(r)));
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "identity") return;
  const user = typeof data.user === "string" ? data.user : "";
  event.waitUntil(
    (async () => {
      const meta = await caches.open(META);
      const stored = await meta.match("/__cc_user");
      const previous = stored ? await stored.text() : "";
      if (previous !== user) {
        await forgetPages();
        await meta.put("/__cc_user", new Response(user));
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (STATIC.test(url.pathname)) {
    event.respondWith(networkFirst(request, ASSETS, true));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(page(request, url));
  }
});

/** Network first; on success optionally save a copy, on failure use the saved copy. */
async function networkFirst(request, cacheName, save) {
  try {
    const response = await fetch(request);
    if (save && response.ok && response.type === "basic") {
      const copy = response.clone();
      caches.open(cacheName).then((c) => c.put(request, copy));
    }
    return response;
  } catch (error) {
    const saved = await caches.match(request, { cacheName });
    if (saved) return saved;
    throw error;
  }
}

async function page(request, url) {
  const readable = READABLE.test(url.pathname);
  try {
    const response = await fetch(request);
    // Save only a real page for the person (not a redirect to sign-in, not an error).
    if (readable && response.ok && !response.redirected && response.type === "basic") {
      const copy = response.clone();
      caches.open(PAGES).then((c) => c.put(url.pathname, copy));
    }
    return response;
  } catch {
    if (readable) {
      const saved = await caches.match(url.pathname, { cacheName: PAGES });
      if (saved) return saved;
    }
    const locale = LOCALES.find((l) => url.pathname === `/${l}` || url.pathname.startsWith(`/${l}/`)) || "en";
    return (await caches.match(`/${locale}/offline`, { cacheName: PAGES })) || Response.error();
  }
}
