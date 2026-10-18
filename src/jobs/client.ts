import "server-only";
import { Inngest } from "inngest";

/** Inngest client (decision #11). Keys come from INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY. */
export const inngest = new Inngest({ id: "coursecapture" });

export const GENERATE_EVENT = "course/generate.requested";

/** Inngest Cloud (keys set) or the local dev server (INNGEST_DEV=1). Otherwise jobs run inline. */
export function isInngestConfigured() {
  return Boolean(process.env.INNGEST_EVENT_KEY) || process.env.INNGEST_DEV === "1";
}
