"use client";

import { useEffect } from "react";

/** The service worker runs in production builds; `NEXT_PUBLIC_SW=1` turns it on in dev (e2e tests). */
const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SW === "1";

async function registration() {
  if (!enabled || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Registers the service worker (public/sw.js) and tells it who is signed in, so
 * pages saved for offline reading never outlive the person they belong to:
 * a different user or a signed-out page (`user={null}`) deletes them (#37).
 * Renders nothing.
 */
export function OfflineIdentity({ user }: { user: string | null }) {
  useEffect(() => {
    let cancelled = false;
    registration().then((reg) => {
      if (!cancelled) reg?.active?.postMessage({ type: "identity", user: user ?? "" });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);
  return null;
}
